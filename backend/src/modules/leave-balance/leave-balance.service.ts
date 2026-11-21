import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { currentYear, yearBounds } from '../../common/date.util';
import { LeaveStatus } from '../../common/enums';
import { LeaveBalance } from '../../database/entities/leave-balance.entity';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { LeaveType } from '../../database/entities/leave-type.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { WorkingDaysService } from '../working-days/working-days.service';

export interface BalanceView {
  balanceId: string;
  leaveTypeId: string;
  name: string;
  description: string | null;
  color: string;
  allowanceDays: number;
  approvedDays: number;
  pendingDays: number;
  availableDays: number;
  year: number;
}

@Injectable()
export class LeaveBalanceService {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly balanceRepository: Repository<LeaveBalance>,
    private readonly dataSource: DataSource,
    private readonly workingDays: WorkingDaysService,
  ) {}

  private repo(manager?: EntityManager): Repository<LeaveBalance> {
    return manager
      ? manager.getRepository(LeaveBalance)
      : this.balanceRepository;
  }

  /**
   * Counts only the working days of a request that fall inside the target year.
   * A request spanning 31 December and 1 January is therefore divided between
   * both years instead of charging its full duration to the start year.
   */
  private countDaysInYear(
    requests: LeaveRequest[],
    yearStart: string,
    yearEnd: string,
    holidays: string[],
  ): number {
    return requests.reduce((total, request) => {
      const from =
        request.startDate > yearStart ? request.startDate : yearStart;
      const to = request.endDate < yearEnd ? request.endDate : yearEnd;
      return from > to
        ? total
        : total + this.workingDays.countWorkingDays(from, to, holidays);
    }, 0);
  }

  /**
   * Creates the current-year entitlement rows for a user when they do not exist.
   * Allowance changes apply to the current and future years; past years keep the
   * snapshot that was in force when that year was opened.
   */
  async ensureBalanceRows(
    userId: string,
    year: number,
    manager: EntityManager,
  ): Promise<LeaveBalance[]> {
    const repository = this.repo(manager);
    const leaveTypes = await manager
      .getRepository(LeaveType)
      .find({ where: { isActive: true } });
    const applyingNewAllowance = year >= currentYear();

    for (const leaveType of leaveTypes) {
      let balance = await repository.findOne({
        where: { userId, leaveTypeId: leaveType.id, year },
      });
      if (!balance) {
        balance = repository.create({
          userId,
          leaveTypeId: leaveType.id,
          year,
          allowanceDays: leaveType.yearlyAllowance,
          approvedDays: 0,
          pendingDays: 0,
          availableDays: leaveType.yearlyAllowance,
        });
      } else if (
        applyingNewAllowance &&
        balance.allowanceDays !== leaveType.yearlyAllowance
      ) {
        balance.allowanceDays = leaveType.yearlyAllowance;
      }
      await repository.save(balance);
    }

    return repository.find({
      where: { userId, year },
      relations: { leaveType: true },
    });
  }

  /**
   * Authoritative balance calculation. Rejected and cancelled requests are
   * ignored. Each request is counted once: PENDING as a reservation and
   * APPROVED as used leave.
   */
  async recalculate(
    userId: string,
    year: number,
    manager: EntityManager,
  ): Promise<LeaveBalance[]> {
    const balances = await this.ensureBalanceRows(userId, year, manager);
    const { start, end } = yearBounds(year);
    const requestRepository = manager.getRepository(LeaveRequest);
    const holidays = (await manager.getRepository(PublicHoliday).find()).map(
      (holiday) => holiday.date,
    );

    for (const balance of balances) {
      const activeRequests = await requestRepository
        .createQueryBuilder('request')
        .where('request.employeeId = :userId', { userId })
        .andWhere('request.leaveTypeId = :leaveTypeId', {
          leaveTypeId: balance.leaveTypeId,
        })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        })
        .andWhere('request.startDate <= :end', { end })
        .andWhere('request.endDate >= :start', { start })
        .getMany();

      balance.pendingDays = this.countDaysInYear(
        activeRequests.filter(
          (request) => request.status === LeaveStatus.PENDING,
        ),
        start,
        end,
        holidays,
      );
      balance.approvedDays = this.countDaysInYear(
        activeRequests.filter(
          (request) => request.status === LeaveStatus.APPROVED,
        ),
        start,
        end,
        holidays,
      );
      balance.availableDays =
        balance.allowanceDays - balance.approvedDays - balance.pendingDays;
      await this.repo(manager).save(balance);
    }

    return balances;
  }

  async getAvailableDays(
    userId: string,
    leaveTypeId: string,
    year: number,
    manager: EntityManager,
  ): Promise<number> {
    const balances = await this.recalculate(userId, year, manager);
    const balance = balances.find((item) => item.leaveTypeId === leaveTypeId);
    if (!balance) {
      throw new BadRequestException(
        'No active balance is configured for this leave type',
      );
    }
    return balance.availableDays;
  }

  async getBalances(
    userId: string,
    year = currentYear(),
  ): Promise<BalanceView[]> {
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      throw new BadRequestException('year must be a valid four-digit year');
    }
    return this.dataSource.transaction(async (manager) => {
      const balances = await this.recalculate(userId, year, manager);
      return balances.map((balance) => ({
        balanceId: balance.id,
        leaveTypeId: balance.leaveTypeId,
        name: balance.leaveType?.name ?? 'Unknown',
        description: balance.leaveType?.description ?? null,
        color: balance.leaveType?.color ?? '#4f46e5',
        allowanceDays: balance.allowanceDays,
        approvedDays: balance.approvedDays,
        pendingDays: balance.pendingDays,
        availableDays: balance.availableDays,
        year: balance.year,
      }));
    });
  }

  async recalculateAllUsersForYear(
    year: number,
    manager?: EntityManager,
  ): Promise<void> {
    const recalculate = async (txManager: EntityManager) => {
      const balances = await txManager
        .getRepository(LeaveBalance)
        .find({ where: { year } });
      const userIds = [...new Set(balances.map((balance) => balance.userId))];
      for (const userId of userIds)
        await this.recalculate(userId, year, txManager);
    };

    if (manager) {
      await recalculate(manager);
      return;
    }
    await this.dataSource.transaction(recalculate);
  }

  /** Called by admin configuration when a yearly allowance changes. */
  async syncAllowanceForType(
    leaveTypeId: string,
    allowanceDays: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(LeaveBalance)
      .createQueryBuilder()
      .update(LeaveBalance)
      .set({ allowanceDays })
      .where('leaveTypeId = :leaveTypeId', { leaveTypeId })
      .andWhere('year >= :currentYear', { currentYear: currentYear() })
      .execute();
  }
}
