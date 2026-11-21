import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  addCalendarDays,
  isValidISODate,
  normalizeDate,
  todayISO,
} from '../../common/date.util';
import {
  ApprovalAction,
  LeaveStatus,
  NotificationType,
  Role,
} from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { ApprovalHistory } from '../../database/entities/approval-history.entity';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { LeaveType } from '../../database/entities/leave-type.entity';
import { Notification } from '../../database/entities/notification.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { OverlapCheckService } from '../overlap-check/overlap-check.service';
import { SettingsService } from '../settings/settings.service';
import { WorkingDaysService } from '../working-days/working-days.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CancelDto } from './dto/decision.dto';
import { mapLeaveRequest, LeaveRequestView } from './leave-request.mapper';

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly requests: Repository<LeaveRequest>,
    private readonly dataSource: DataSource,
    private readonly workingDays: WorkingDaysService,
    private readonly balanceService: LeaveBalanceService,
    private readonly overlapCheck: OverlapCheckService,
    private readonly settingsService: SettingsService,
  ) {}

  private repo(manager?: EntityManager): Repository<LeaveRequest> {
    return manager ? manager.getRepository(LeaveRequest) : this.requests;
  }

  private async lockUser(
    userId: string,
    manager: EntityManager,
  ): Promise<User | null> {
    const query = manager
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId });
    if ((manager.connection.options as { type?: string }).type === 'postgres') {
      query.setLock('pessimistic_write');
    }
    return query.getOne();
  }

  private async lockRequest(
    id: string,
    manager: EntityManager,
  ): Promise<LeaveRequest | null> {
    const query = manager
      .getRepository(LeaveRequest)
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('request.id = :id', { id });
    if ((manager.connection.options as { type?: string }).type === 'postgres') {
      query.setLock('pessimistic_write');
    }
    return query.getOne();
  }

  private loadRequest(id: string): Promise<LeaveRequest | null> {
    return this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('request.id = :id', { id })
      .getOne();
  }

  async create(
    employeeId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestView> {
    if (!isValidISODate(dto.startDate) || !isValidISODate(dto.endDate)) {
      throw new BadRequestException('Dates must use the YYYY-MM-DD format');
    }

    return this.dataSource.transaction(async (manager) => {
      const employee = await this.lockUser(employeeId, manager);
      if (!employee || !employee.isActive)
        throw new NotFoundException('Employee not found');

      const leaveType = await manager.getRepository(LeaveType).findOne({
        where: { id: dto.leaveTypeId, isActive: true },
      });
      if (!leaveType)
        throw new BadRequestException(
          'Leave type was not found or is inactive',
        );

      const startDate = normalizeDate(dto.startDate);
      const endDate = normalizeDate(dto.endDate);
      if (endDate < startDate) {
        throw new BadRequestException(
          'End date cannot be before the start date',
        );
      }

      const minNoticeDays =
        await this.settingsService.getMinNoticeDays(manager);
      const earliestAllowed = addCalendarDays(todayISO(), minNoticeDays);
      if (startDate < earliestAllowed) {
        throw new BadRequestException(
          `Leave must start at least ${minNoticeDays} calendar day(s) from today (earliest: ${earliestAllowed})`,
        );
      }

      const holidays = (await manager.getRepository(PublicHoliday).find()).map(
        (holiday) => holiday.date,
      );
      const workingDates = this.workingDays.getWorkingDates(
        startDate,
        endDate,
        holidays,
      );
      if (workingDates.length === 0) {
        throw new BadRequestException(
          'The selected range contains no working days (weekends and holidays are excluded)',
        );
      }

      await this.overlapCheck.checkEmployeeOverlap(
        employeeId,
        startDate,
        endDate,
        manager,
      );
      await this.overlapCheck.lockTeam(employee.teamId ?? '', manager);

      const year = Number(startDate.slice(0, 4));
      const available = await this.balanceService.getAvailableDays(
        employeeId,
        leaveType.id,
        year,
        manager,
      );
      if (available < workingDates.length) {
        throw new BadRequestException(
          `Insufficient ${leaveType.name} balance: ${available} day(s) available, ${workingDates.length} requested`,
        );
      }

      await this.overlapCheck.checkTeamCoverage(
        employee.teamId ?? '',
        employeeId,
        workingDates,
        manager,
      );

      const request = this.repo(manager).create({
        employeeId,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        workingDays: workingDates.length,
        reason: dto.reason.trim(),
        status: LeaveStatus.PENDING,
        comment: null,
      });
      await this.repo(manager).save(request);

      await manager.getRepository(ApprovalHistory).save(
        manager.getRepository(ApprovalHistory).create({
          requestId: request.id,
          action: ApprovalAction.SUBMITTED,
          actorId: employeeId,
          comment: 'Leave request submitted',
        }),
      );

      if (employee.managerId) {
        await manager.getRepository(Notification).save(
          manager.getRepository(Notification).create({
            userId: employee.managerId,
            title: 'New leave request',
            message: `${employee.fullName} requested ${workingDates.length} day(s) of ${leaveType.name}`,
            type: NotificationType.INFO,
            relatedRequestId: request.id,
            isRead: false,
          }),
        );
      }

      await this.balanceService.recalculate(employeeId, year, manager);
      return mapLeaveRequest(
        (await this.loadRequestInManager(request.id, manager))!,
      );
    });
  }

  private loadRequestInManager(
    id: string,
    manager: EntityManager,
  ): Promise<LeaveRequest | null> {
    return manager
      .getRepository(LeaveRequest)
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('request.id = :id', { id })
      .getOne();
  }

  async findMine(
    user: AuthenticatedUser,
    status?: string,
    year?: number,
  ): Promise<LeaveRequestView[]> {
    const query = this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('request.employeeId = :id', { id: user.id })
      .orderBy('request.createdAt', 'DESC');

    if (status) query.andWhere('request.status = :status', { status });
    if (year) {
      query.andWhere('request.startDate BETWEEN :start AND :end', {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      });
    }
    const requests = await query.getMany();
    return requests.map(mapLeaveRequest);
  }

  async findOneForViewer(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<LeaveRequestView> {
    const request = await this.loadRequest(id);
    if (!request) throw new NotFoundException('Leave request not found');

    if (viewer.role === Role.EMPLOYEE && request.employeeId !== viewer.id) {
      throw new ForbiddenException(
        'You cannot view another employee’s leave request',
      );
    }
    if (viewer.role === Role.MANAGER) {
      const isReport = Boolean(
        request.employee?.managerId && request.employee.managerId === viewer.id,
      );
      if (!isReport && request.employeeId !== viewer.id) {
        throw new ForbiddenException(
          'This request does not belong to one of your reports',
        );
      }
    }
    return mapLeaveRequest(request);
  }

  async cancel(
    id: string,
    userId: string,
    dto: CancelDto,
  ): Promise<LeaveRequestView> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.lockRequest(id, manager);
      if (!request) throw new NotFoundException('Leave request not found');
      if (request.employeeId !== userId) {
        throw new ForbiddenException(
          'Only the request owner can cancel this request',
        );
      }
      if (
        ![LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(request.status)
      ) {
        throw new BadRequestException(
          `A ${request.status} request cannot be cancelled`,
        );
      }
      if (request.startDate < todayISO()) {
        throw new BadRequestException(
          'A request that has already started cannot be cancelled',
        );
      }

      request.status = LeaveStatus.CANCELLED;
      request.comment = dto.comment ?? request.comment;
      await this.repo(manager).save(request);

      await manager.getRepository(ApprovalHistory).save(
        manager.getRepository(ApprovalHistory).create({
          requestId: request.id,
          action: ApprovalAction.CANCELLED,
          actorId: userId,
          comment: dto.comment ?? 'Request cancelled by employee',
        }),
      );

      await this.balanceService.recalculate(
        userId,
        Number(request.startDate.slice(0, 4)),
        manager,
      );
      return mapLeaveRequest(
        (await this.loadRequestInManager(request.id, manager))!,
      );
    });
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.loadRequest(id);
  }

  async recalcForRequest(
    request: LeaveRequest,
    manager: EntityManager,
  ): Promise<void> {
    await this.balanceService.recalculate(
      request.employeeId,
      Number(request.startDate.slice(0, 4)),
      manager,
    );
  }

  async recordHistory(
    requestId: string,
    action: ApprovalAction,
    actorId: string,
    comment: string | null,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(ApprovalHistory)
      .save(
        manager
          .getRepository(ApprovalHistory)
          .create({ requestId, action, actorId, comment }),
      );
  }

  async notifyUser(
    userId: string,
    title: string,
    message: string,
    requestId: string,
    type: NotificationType,
    manager: EntityManager,
  ): Promise<void> {
    await manager.getRepository(Notification).save(
      manager.getRepository(Notification).create({
        userId,
        title,
        message,
        type,
        relatedRequestId: requestId,
        isRead: false,
      }),
    );
  }
}
