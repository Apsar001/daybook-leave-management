import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { addCalendarDays } from '../../common/date.util';
import { ApprovalAction, LeaveStatus, Role } from '../../common/enums';
import { WorkingDaysService } from '../../modules/working-days/working-days.service';
import { AppDataSource } from '../data-source';
import { ApprovalHistory } from '../entities/approval-history.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveType } from '../entities/leave-type.entity';
import { PublicHoliday } from '../entities/public-holiday.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { Team } from '../entities/team.entity';
import { User } from '../entities/user.entity';
import { LeaveBalanceService } from '../../modules/leave-balance/leave-balance.service';

const DEMO_PASSWORD = 'Demo@12345';
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  manager1: '00000000-0000-4000-8000-000000000002',
  manager2: '00000000-0000-4000-8000-000000000003',
  team1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  team2: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  annual: '11111111-1111-4111-8111-111111111111',
  sick: '22222222-2222-4222-8222-222222222222',
  unpaid: '33333333-3333-4333-8333-333333333333',
};

const employeeIds = Array.from(
  { length: 8 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(0x11 + index).padStart(12, '0')}`,
);

const employeeNames = [
  'Ava Thompson',
  'Noah Bennett',
  'Mia Rodriguez',
  'Liam Chen',
  'Sophia Patel',
  'Ethan Brooks',
  'Isabella Reed',
  'Lucas Morgan',
];

const managerNames = ['Daniel Foster', 'Emma Wilson'];

interface PlannedRequest {
  id: string;
  employeeId: string;
  teamId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: LeaveStatus;
  reason: string;
  decidedById: string | null;
}

async function clearDatabase(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  const tables = [
    'approval_history',
    'notifications',
    'refresh_tokens',
    'leave_balances',
    'leave_requests',
    'public_holidays',
    'system_settings',
    'teams',
    'users',
    'leave_types',
  ];
  for (const table of tables) {
    await queryRunner.query(`DELETE FROM "${table}"`);
  }
  await queryRunner.release();
}

function workingDatesBetween(
  workingDaysService: WorkingDaysService,
  start: string,
  count: number,
  holidays: string[],
): string[] {
  const dates: string[] = [];
  let cursor = workingDaysService.nextWorkingDate(start, holidays);
  while (dates.length < count) {
    dates.push(cursor);
    cursor = workingDaysService.nextWorkingDate(
      addCalendarDays(cursor, 1),
      holidays,
    );
  }
  return dates;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource.isInitialized) await dataSource.initialize();

  await clearDatabase(dataSource);
  const workingDaysService = new WorkingDaysService();
  const year = new Date().getUTCFullYear();
  const today = new Date().toISOString().slice(0, 10);

  // Leave types — allowances are configuration, never hardcoded in business logic.
  const leaveTypeRepo = dataSource.getRepository(LeaveType);
  await leaveTypeRepo.save([
    leaveTypeRepo.create({
      id: ids.annual,
      name: 'Annual Leave',
      description: 'Planned time off from work',
      yearlyAllowance: 20,
      isActive: true,
      color: '#4f46e5',
    }),
    leaveTypeRepo.create({
      id: ids.sick,
      name: 'Sick Leave',
      description: 'Leave due to illness or medical appointments',
      yearlyAllowance: 10,
      isActive: true,
      color: '#0ea5e9',
    }),
    leaveTypeRepo.create({
      id: ids.unpaid,
      name: 'Unpaid Leave',
      description:
        'Personal leave without pay, subject to a 5-day yearly policy',
      yearlyAllowance: 5,
      isActive: true,
      color: '#f59e0b',
    }),
  ]);

  const settingsRepo = dataSource.getRepository(SystemSetting);
  await settingsRepo.save([
    settingsRepo.create({
      key: 'min_notice_days',
      value: '1',
      description:
        'Minimum calendar days of notice required before a leave start date',
    }),
    settingsRepo.create({
      key: 'max_team_members_off',
      value: '2',
      description:
        'Maximum number of team members allowed off on the same working day',
    }),
  ]);

  const holidayRepo = dataSource.getRepository(PublicHoliday);
  const holidayDefinitions: Array<[string, string]> = [
    [`${year}-01-01`, "New Year's Day"],
    [`${year}-03-17`, 'St. Patrick’s Day'],
    [`${year}-05-01`, 'Labour Day'],
    [`${year}-07-04`, 'Independence Day'],
    [`${year}-09-07`, 'Labour Day Holiday'],
    [`${year}-11-26`, 'Thanksgiving Day'],
    [`${year}-12-25`, 'Christmas Day'],
  ];
  await holidayRepo.save(
    holidayDefinitions.map(([date, name]) =>
      holidayRepo.create({ date, name }),
    ),
  );
  const holidays = holidayDefinitions.map(([date]) => date);

  const teamRepo = dataSource.getRepository(Team);
  const teams = [
    teamRepo.create({
      id: ids.team1,
      name: 'Product & Engineering',
      description: 'Product delivery and engineering team',
      managerId: null,
    }),
    teamRepo.create({
      id: ids.team2,
      name: 'Operations & Support',
      description: 'Business operations and customer support team',
      managerId: null,
    }),
  ];
  await teamRepo.save(teams);

  const userRepo = dataSource.getRepository(User);
  const users: User[] = [
    userRepo.create({
      id: ids.admin,
      email: 'admin@leave.com',
      passwordHash,
      fullName: 'Alex Administrator',
      role: Role.ADMIN,
      teamId: null,
      managerId: null,
      isActive: true,
    }),
    userRepo.create({
      id: ids.manager1,
      email: 'manager1@leave.com',
      passwordHash,
      fullName: managerNames[0],
      role: Role.MANAGER,
      teamId: ids.team1,
      managerId: null,
      isActive: true,
    }),
    userRepo.create({
      id: ids.manager2,
      email: 'manager2@leave.com',
      passwordHash,
      fullName: managerNames[1],
      role: Role.MANAGER,
      teamId: ids.team2,
      managerId: null,
      isActive: true,
    }),
  ];

  employeeIds.forEach((id, index) => {
    const teamId = index < 4 ? ids.team1 : ids.team2;
    const managerId = index < 4 ? ids.manager1 : ids.manager2;
    users.push(
      userRepo.create({
        id,
        email: `employee${index + 1}@leave.com`,
        passwordHash,
        fullName: employeeNames[index],
        role: Role.EMPLOYEE,
        teamId,
        managerId,
        isActive: true,
      }),
    );
  });
  await userRepo.save(users);

  // Teams are created first because users reference them; assign managers afterwards.
  teams[0].managerId = ids.manager1;
  teams[1].managerId = ids.manager2;
  await teamRepo.save(teams);

  const requestRepo = dataSource.getRepository(LeaveRequest);
  const historyRepo = dataSource.getRepository(ApprovalHistory);
  const planned: PlannedRequest[] = [];
  const typeByIndex = [
    ids.annual,
    ids.sick,
    ids.annual,
    ids.unpaid,
    ids.annual,
  ];
  const reasonByIndex = [
    'Family vacation',
    'Medical appointment',
    'Personal time off',
    'Home renovation',
    'Annual break',
  ];

  for (
    let employeeIndex = 0;
    employeeIndex < employeeIds.length;
    employeeIndex += 1
  ) {
    const employeeId = employeeIds[employeeIndex];
    const teamId = employeeIndex < 4 ? ids.team1 : ids.team2;
    const managerId = employeeIndex < 4 ? ids.manager1 : ids.manager2;

    for (let requestIndex = 0; requestIndex < 5; requestIndex += 1) {
      const leaveTypeId = typeByIndex[requestIndex];
      const duration = 1 + ((employeeIndex + requestIndex) % 3);
      const preferredOffset = -35 + employeeIndex * 3 + requestIndex * 14;
      let candidate = addCalendarDays(today, preferredOffset);
      let accepted = false;

      for (let attempt = 0; attempt < 60 && !accepted; attempt += 1) {
        const dates = workingDatesBetween(
          workingDaysService,
          candidate,
          duration,
          holidays,
        );
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        let status: LeaveStatus;
        if (requestIndex === 0) status = LeaveStatus.APPROVED;
        else if (requestIndex === 1)
          status =
            (employeeIndex + requestIndex) % 3 === 0
              ? LeaveStatus.APPROVED
              : LeaveStatus.REJECTED;
        else if (requestIndex === 2) status = LeaveStatus.PENDING;
        else if (requestIndex === 3) status = LeaveStatus.CANCELLED;
        else status = LeaveStatus.APPROVED;

        // Pending requests must respect the minimum notice rule.
        if (
          status === LeaveStatus.PENDING &&
          startDate <= addCalendarDays(today, 1)
        ) {
          status = LeaveStatus.APPROVED;
        }

        const active = [LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(
          status,
        );
        const employeeOverlap =
          active &&
          planned.some(
            (request) =>
              request.employeeId === employeeId &&
              [LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(
                request.status,
              ) &&
              overlaps(request.startDate, request.endDate, startDate, endDate),
          );

        const coverage =
          active &&
          planned.some((request) => {
            if (request.teamId !== teamId || request.employeeId === employeeId)
              return false;
            if (
              ![LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(
                request.status,
              )
            )
              return false;
            return dates.some(
              (date) => request.startDate <= date && request.endDate >= date,
            );
          });

        const consumedByType = planned
          .filter(
            (request) =>
              request.employeeId === employeeId &&
              request.leaveTypeId === leaveTypeId &&
              [LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(
                request.status,
              ),
          )
          .reduce((sum, request) => sum + request.workingDays, 0);
        const allowances: Record<string, number> = {
          [ids.annual]: 20,
          [ids.sick]: 10,
          [ids.unpaid]: 5,
        };
        const withinBalance =
          consumedByType + duration <= allowances[leaveTypeId];

        if (!employeeOverlap && !coverage && withinBalance) {
          planned.push({
            id: `44444444-4444-4444-8444-${String(employeeIndex * 5 + requestIndex + 1).padStart(12, '0')}`,
            employeeId,
            teamId,
            leaveTypeId,
            startDate,
            endDate,
            workingDays: duration,
            status,
            reason: reasonByIndex[requestIndex],
            decidedById:
              status === LeaveStatus.CANCELLED
                ? employeeId
                : status === LeaveStatus.PENDING
                  ? null
                  : managerId,
          });
          accepted = true;
        } else {
          candidate = addCalendarDays(candidate, 7);
        }
      }
    }
  }

  const requestEntities = planned.map((request) =>
    requestRepo.create({
      id: request.id,
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      workingDays: request.workingDays,
      reason: request.reason,
      status: request.status,
      comment:
        request.status === LeaveStatus.REJECTED
          ? 'Insufficient coverage for this period'
          : null,
      decidedAt:
        request.status === LeaveStatus.PENDING
          ? null
          : new Date(`${request.startDate}T09:00:00.000Z`),
      decidedById: request.decidedById,
    }),
  );
  await requestRepo.save(requestEntities);

  const historyEntities: ApprovalHistory[] = [];
  for (const request of planned) {
    historyEntities.push(
      historyRepo.create({
        requestId: request.id,
        action: ApprovalAction.SUBMITTED,
        actorId: request.employeeId,
        comment: 'Leave request submitted',
      }),
    );
    if (request.status !== LeaveStatus.PENDING) {
      historyEntities.push(
        historyRepo.create({
          requestId: request.id,
          action:
            request.status === LeaveStatus.APPROVED
              ? ApprovalAction.APPROVED
              : request.status === LeaveStatus.REJECTED
                ? ApprovalAction.REJECTED
                : ApprovalAction.CANCELLED,
          actorId: request.decidedById,
          comment:
            request.status === LeaveStatus.REJECTED
              ? 'Insufficient coverage for this period'
              : request.status === LeaveStatus.CANCELLED
                ? 'Cancelled by employee'
                : 'Approved by manager',
        }),
      );
    }
  }
  await historyRepo.save(historyEntities);

  const balanceService = new LeaveBalanceService(
    dataSource.getRepository(LeaveBalance),
    dataSource,
    workingDaysService,
  );
  await dataSource.transaction(async (manager) => {
    for (const employeeId of employeeIds) {
      await balanceService.recalculate(employeeId, year, manager);
    }
  });

  const statusCounts = planned.reduce<Record<string, number>>(
    (counts, request) => {
      counts[request.status] = (counts[request.status] ?? 0) + 1;
      return counts;
    },
    {},
  );

  console.log('Seed completed successfully.');
  console.log(`Users: ${users.length} (1 admin, 2 managers, 8 employees)`);
  console.log(
    `Leave types: 3 | Holidays: ${holidayDefinitions.length} | Requests: ${planned.length}`,
  );
  console.log('Status counts:', statusCounts);
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
}

if (require.main === module) {
  seedDatabase(AppDataSource)
    .then(() => AppDataSource.destroy())
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    });
}
