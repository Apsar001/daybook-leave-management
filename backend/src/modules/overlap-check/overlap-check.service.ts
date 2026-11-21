import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { datesOverlap, normalizeDate } from '../../common/date.util';
import { LeaveStatus } from '../../common/enums';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { Team } from '../../database/entities/team.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OverlapCheckService {
  constructor(private readonly settingsService: SettingsService) {}

  async lockTeam(teamId: string, manager: EntityManager): Promise<void> {
    const query = manager
      .getRepository(Team)
      .createQueryBuilder('team')
      .where('team.id = :id', { id: teamId });
    if ((manager.connection.options as { type?: string }).type === 'postgres') {
      query.setLock('pessimistic_write');
    }
    await query.getOne();
  }

  /** PENDING and APPROVED requests from the same employee must not overlap. */
  async checkEmployeeOverlap(
    employeeId: string,
    startDate: string,
    endDate: string,
    manager: EntityManager,
    excludeRequestId?: string,
  ): Promise<void> {
    const query = manager
      .getRepository(LeaveRequest)
      .createQueryBuilder('request')
      .where('request.employeeId = :employeeId', { employeeId })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere('request.startDate <= :endDate', {
        endDate: normalizeDate(endDate),
      })
      .andWhere('request.endDate >= :startDate', {
        startDate: normalizeDate(startDate),
      });

    if (excludeRequestId) {
      query.andWhere('request.id <> :excludeRequestId', { excludeRequestId });
    }

    const overlapping = await query.getOne();
    if (overlapping) {
      throw new BadRequestException(
        `You already have an active leave request from ${overlapping.startDate} to ${overlapping.endDate}. Overlapping requests are not allowed.`,
      );
    }
  }

  /**
   * Enforces the administrator-configured maximum number of team members off on
   * every affected working date. The requesting employee is excluded so their
   * own new request cannot be counted against itself.
   */
  async checkTeamCoverage(
    teamId: string,
    employeeId: string,
    workingDates: string[],
    manager: EntityManager,
  ): Promise<void> {
    if (!teamId || workingDates.length === 0) return;
    const maxOff = await this.settingsService.getMaxTeamMembersOff(manager);

    for (const date of workingDates) {
      const result = await manager
        .getRepository(LeaveRequest)
        .createQueryBuilder('request')
        .select('COUNT(DISTINCT request.employeeId)', 'count')
        .innerJoin('request.employee', 'employee')
        .where('employee.teamId = :teamId', { teamId })
        .andWhere('request.employeeId <> :employeeId', { employeeId })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        })
        .andWhere('request.startDate <= :date', { date })
        .andWhere('request.endDate >= :date', { date })
        .getRawOne<{ count: string | number }>();

      const othersOff = Number(result?.count ?? 0);
      if (othersOff >= maxOff) {
        throw new BadRequestException(
          `Team coverage limit reached on ${date}: at most ${maxOff} team member(s) may be off on the same day.`,
        );
      }
    }
  }

  /** Used by tests and calendar logic to verify inclusive overlap semantics. */
  static overlaps(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
  ): boolean {
    return datesOverlap(aStart, aEnd, bStart, bEnd);
  }
}
