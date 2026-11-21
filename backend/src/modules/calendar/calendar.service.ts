import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { eachCalendarDate, monthBounds } from '../../common/date.util';
import { LeaveStatus, Role } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { User } from '../../database/entities/user.entity';
import { WorkingDaysService } from '../working-days/working-days.service';

export interface CalendarQuery {
  year: number;
  month: number;
  teamId?: string;
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly requests: Repository<LeaveRequest>,
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly workingDays: WorkingDaysService,
  ) {}

  async getCalendar(viewer: AuthenticatedUser, query: CalendarQuery) {
    const { year, month, teamId } = query;
    const { start, end } = monthBounds(year, month);

    let allowedTeamIds: string[] | null = null;
    if (viewer.role === Role.EMPLOYEE || viewer.role === Role.MANAGER) {
      if (!viewer.teamId)
        throw new ForbiddenException('Your account is not assigned to a team');
      if (teamId && teamId !== viewer.teamId) {
        throw new ForbiddenException('You cannot view another team’s calendar');
      }
      allowedTeamIds = [viewer.teamId];
    } else if (teamId) {
      allowedTeamIds = [teamId];
    }

    const holidayRows = await this.holidays.find({
      where: { date: Between(start, end) },
      order: { date: 'ASC' },
    });
    const holidayDates = holidayRows.map((holiday) => holiday.date);

    const requestQuery = this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .where('request.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere('request.startDate <= :end', { end })
      .andWhere('request.endDate >= :start', { start });

    if (allowedTeamIds) {
      requestQuery.andWhere('team.id IN (:...teamIds)', {
        teamIds: allowedTeamIds,
      });
    }
    const requestRows = await requestQuery
      .orderBy('request.startDate', 'ASC')
      .getMany();

    const teamQuery = this.users
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true });
    if (allowedTeamIds)
      teamQuery.andWhere('user.teamId IN (:...teamIds)', {
        teamIds: allowedTeamIds,
      });
    const teamMembers = await teamQuery.getMany();
    const teamSize = teamMembers.length;

    const workingDates = this.workingDays
      .getWorkingDates(start, end, holidayDates)
      .filter((date) => date >= start && date <= end);
    const allDates = eachCalendarDate(start, end);

    const availability = workingDates.map((date) => {
      const covering = requestRows.filter(
        (request) => request.startDate <= date && request.endDate >= date,
      );
      const onLeave = new Set(
        covering
          .filter((request) => request.status === LeaveStatus.APPROVED)
          .map((request) => request.employeeId),
      ).size;
      const pending = new Set(
        covering
          .filter((request) => request.status === LeaveStatus.PENDING)
          .map((request) => request.employeeId),
      ).size;
      return {
        date,
        total: teamSize,
        available: Math.max(0, teamSize - onLeave - pending),
        onLeave,
        pending,
      };
    });

    return {
      year,
      month,
      teamId: teamId ?? viewer.teamId ?? null,
      holidays: holidayRows.map((holiday) => ({
        id: holiday.id,
        name: holiday.name,
        date: holiday.date,
      })),
      requests: requestRows.map((request) => ({
        id: request.id,
        employee: {
          id: request.employee?.id ?? request.employeeId,
          fullName: request.employee?.fullName ?? 'Unknown',
        },
        leaveType: {
          id: request.leaveType?.id ?? request.leaveTypeId,
          name: request.leaveType?.name ?? 'Leave',
          color: request.leaveType?.color ?? '#4f46e5',
        },
        startDate: request.startDate,
        endDate: request.endDate,
        status: request.status,
        workingDays: request.workingDays,
      })),
      availability,
      dates: allDates,
    };
  }
}
