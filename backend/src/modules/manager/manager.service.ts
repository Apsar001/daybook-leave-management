import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  isValidISODate,
  normalizeDate,
  todayISO,
  yearBounds,
} from '../../common/date.util';
import {
  ApprovalAction,
  LeaveStatus,
  NotificationType,
  Role,
} from '../../common/enums';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import {
  mapLeaveRequest,
  LeaveRequestView,
} from '../leave-requests/leave-request.mapper';
import { OverlapCheckService } from '../overlap-check/overlap-check.service';
import { WorkingDaysService } from '../working-days/working-days.service';

@Injectable()
export class ManagerService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LeaveRequest)
    private readonly requests: Repository<LeaveRequest>,
    private readonly dataSource: DataSource,
    private readonly balanceService: LeaveBalanceService,
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly overlapCheck: OverlapCheckService,
    private readonly workingDays: WorkingDaysService,
  ) {}

  async getTeam(managerId: string) {
    const members = await this.users.find({
      where: { managerId, role: Role.EMPLOYEE, isActive: true },
      relations: { team: true },
      order: { fullName: 'ASC' },
    });
    const result = [];
    for (const member of members) {
      const balances = await this.balanceService.getBalances(member.id);
      result.push({
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        teamId: member.teamId,
        teamName: member.team?.name ?? null,
        balances: balances.map((balance) => ({
          name: balance.name,
          availableDays: balance.availableDays,
          approvedDays: balance.approvedDays,
          pendingDays: balance.pendingDays,
          allowanceDays: balance.allowanceDays,
        })),
      });
    }
    return result;
  }

  private queryReports(managerId: string) {
    return this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('employee.managerId = :managerId', { managerId });
  }

  async getPendingRequests(managerId: string): Promise<LeaveRequestView[]> {
    const requests = await this.queryReports(managerId)
      .andWhere('request.status = :status', { status: LeaveStatus.PENDING })
      .orderBy('request.createdAt', 'DESC')
      .getMany();
    return requests.map(mapLeaveRequest);
  }

  async getTeamHistory(
    managerId: string,
    status?: string,
    year?: number,
  ): Promise<LeaveRequestView[]> {
    const query = this.queryReports(managerId);
    if (status) query.andWhere('request.status = :status', { status });
    if (year) {
      const { start, end } = yearBounds(year);
      query.andWhere('request.startDate BETWEEN :start AND :end', {
        start,
        end,
      });
    }
    const requests = await query.orderBy('request.createdAt', 'DESC').getMany();
    return requests.map(mapLeaveRequest);
  }

  async getAvailability(managerId: string, date: string) {
    if (!isValidISODate(date))
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    const value = normalizeDate(date);
    const members = await this.users.find({
      where: { managerId, role: Role.EMPLOYEE, isActive: true },
      order: { fullName: 'ASC' },
    });
    if (members.length === 0) {
      return {
        date: value,
        teamSize: 0,
        available: 0,
        onLeave: 0,
        pending: 0,
        members: [],
      };
    }

    const requests = await this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .where('request.employeeId IN (:...ids)', {
        ids: members.map((member) => member.id),
      })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere('request.startDate <= :date', { date: value })
      .andWhere('request.endDate >= :date', { date: value })
      .getMany();

    const byEmployee = new Map<string, LeaveRequest>();
    for (const request of requests) byEmployee.set(request.employeeId, request);

    const memberViews = members.map((member) => {
      const request = byEmployee.get(member.id);
      return {
        id: member.id,
        fullName: member.fullName,
        status: request ? String(request.status) : 'AVAILABLE',
        leaveType: request?.leaveType?.name ?? null,
      };
    });
    const onLeave = memberViews.filter(
      (member) => member.status === 'APPROVED',
    ).length;
    const pending = memberViews.filter(
      (member) => member.status === 'PENDING',
    ).length;
    return {
      date: value,
      teamSize: members.length,
      available: members.length - onLeave - pending,
      onLeave,
      pending,
      members: memberViews,
    };
  }

  private async loadRequestForDecision(
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

  async decide(
    requestId: string,
    managerId: string,
    decision: 'APPROVED' | 'REJECTED',
    comment: string | null,
  ): Promise<LeaveRequestView> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadRequestForDecision(requestId, manager);
      if (!request) throw new NotFoundException('Leave request not found');
      if (!request.employee || request.employee.managerId !== managerId) {
        throw new ForbiddenException(
          'You can only decide requests from employees who report to you',
        );
      }
      if (request.status !== LeaveStatus.PENDING) {
        throw new BadRequestException(
          `Only PENDING requests can be ${decision.toLowerCase()}; this request is ${request.status}`,
        );
      }

      // Configuration can change after submission, so every rule is re-checked at
      // the decision point before a pending request becomes approved.
      if (decision === 'APPROVED') {
        if (request.startDate < todayISO()) {
          throw new BadRequestException(
            'A request that has already started cannot be approved',
          );
        }
        await this.overlapCheck.checkEmployeeOverlap(
          request.employeeId,
          request.startDate,
          request.endDate,
          manager,
          request.id,
        );

        if (request.employee?.teamId) {
          await this.overlapCheck.lockTeam(request.employee.teamId, manager);
          const holidays = (
            await manager.getRepository(PublicHoliday).find()
          ).map((holiday) => holiday.date);
          const workingDates = this.workingDays.getWorkingDates(
            request.startDate,
            request.endDate,
            holidays,
          );
          await this.overlapCheck.checkTeamCoverage(
            request.employee.teamId,
            request.employeeId,
            workingDates,
            manager,
          );
        }

        const available = await this.balanceService.getAvailableDays(
          request.employeeId,
          request.leaveTypeId,
          Number(request.startDate.slice(0, 4)),
          manager,
        );
        if (available < 0) {
          throw new BadRequestException(
            `Cannot approve: the current ${request.leaveType?.name ?? 'leave'} allowance no longer covers the days reserved for this request`,
          );
        }
      }

      request.status = decision as LeaveStatus;
      request.comment = comment;
      request.decidedAt = new Date();
      request.decidedById = managerId;
      await manager.getRepository(LeaveRequest).save(request);

      await this.leaveRequestsService.recordHistory(
        request.id,
        decision === 'APPROVED'
          ? ApprovalAction.APPROVED
          : ApprovalAction.REJECTED,
        managerId,
        comment,
        manager,
      );
      await this.leaveRequestsService.notifyUser(
        request.employeeId,
        decision === 'APPROVED'
          ? 'Leave request approved'
          : 'Leave request rejected',
        `Your ${request.leaveType?.name ?? 'leave'} request from ${request.startDate} to ${request.endDate} was ${decision.toLowerCase()}.`,
        request.id,
        decision === 'APPROVED'
          ? NotificationType.SUCCESS
          : NotificationType.WARNING,
        manager,
      );

      await this.leaveRequestsService.recalcForRequest(request, manager);
      return mapLeaveRequest(
        (await this.loadRequestForDecision(request.id, manager))!,
      );
    });
  }
}
