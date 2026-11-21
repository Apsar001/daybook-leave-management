import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { addCalendarDays, parseISODate, todayISO } from '../common/date.util';
import { Role } from '../common/enums';
import { PublicHoliday } from '../database/entities/public-holiday.entity';
import { SystemSetting } from '../database/entities/system-setting.entity';
import { Team } from '../database/entities/team.entity';
import { User } from '../database/entities/user.entity';
import { LeaveType } from '../database/entities/leave-type.entity';

export const TEST_PASSWORD = 'Demo@12345';
export const IDS = {
  admin: '20000000-0000-4000-8000-000000000001',
  manager1: '20000000-0000-4000-8000-000000000002',
  manager2: '20000000-0000-4000-8000-000000000003',
  emp1: '20000000-0000-4000-8000-000000000011',
  emp2: '20000000-0000-4000-8000-000000000012',
  emp3: '20000000-0000-4000-8000-000000000013',
  emp4: '20000000-0000-4000-8000-000000000014',
  emp5: '20000000-0000-4000-8000-000000000015',
  teamA: '10000000-0000-4000-8000-000000000001',
  teamB: '10000000-0000-4000-8000-000000000002',
  annual: '30000000-0000-4000-8000-000000000001',
  sick: '30000000-0000-4000-8000-000000000002',
  unpaid: '30000000-0000-4000-8000-000000000003',
};

export function isWeekend(date: string): boolean {
  const day = parseISODate(date).getUTCDay();
  return day === 0 || day === 6;
}

export function pickWorkday(
  offsetFromToday: number,
  holidays: string[] = [],
): string {
  let date = addCalendarDays(todayISO(), offsetFromToday);
  for (let i = 0; i < 21; i += 1) {
    if (!isWeekend(date) && !holidays.includes(date)) return date;
    date = addCalendarDays(date, 1);
  }
  throw new Error('Could not find a working date');
}

export function pickWeekday(
  weekday: 1 | 2 | 3 | 4 | 5,
  minOffset = 3,
  holidays: string[] = [],
): string {
  let date = addCalendarDays(todayISO(), minOffset);
  for (let i = 0; i < 21; i += 1) {
    if (parseISODate(date).getUTCDay() === weekday && !holidays.includes(date))
      return date;
    date = addCalendarDays(date, 1);
  }
  throw new Error('Could not find requested weekday');
}

export async function seedTestData(
  dataSource: DataSource,
): Promise<{ holidayDate: string }> {
  const hash = bcrypt.hashSync(
    TEST_PASSWORD,
    Number(process.env.BCRYPT_ROUNDS || 4),
  );
  const holidayDate = pickWorkday(12);

  const teamRepo = dataSource.getRepository(Team);
  const teams = [
    teamRepo.create({
      id: IDS.teamA,
      name: 'Team Alpha',
      description: 'Test team A',
      managerId: null,
    }),
    teamRepo.create({
      id: IDS.teamB,
      name: 'Team Beta',
      description: 'Test team B',
      managerId: null,
    }),
  ];
  await teamRepo.save(teams);

  const leaveTypeRepo = dataSource.getRepository(LeaveType);
  await leaveTypeRepo.save([
    leaveTypeRepo.create({
      id: IDS.annual,
      name: 'Annual Leave',
      description: 'Annual leave',
      yearlyAllowance: 20,
      isActive: true,
      color: '#4f46e5',
    }),
    leaveTypeRepo.create({
      id: IDS.sick,
      name: 'Sick Leave',
      description: 'Sick leave',
      yearlyAllowance: 10,
      isActive: true,
      color: '#0ea5e9',
    }),
    leaveTypeRepo.create({
      id: IDS.unpaid,
      name: 'Unpaid Leave',
      description: 'Unpaid leave',
      yearlyAllowance: 5,
      isActive: true,
      color: '#f59e0b',
    }),
  ]);

  const userRepo = dataSource.getRepository(User);
  const user = (
    id: string,
    email: string,
    fullName: string,
    role: Role,
    teamId: string | null,
    managerId: string | null,
  ) =>
    userRepo.create({
      id,
      email,
      fullName,
      role,
      teamId,
      managerId,
      passwordHash: hash,
      isActive: true,
    });

  await userRepo.save([
    user(IDS.admin, 'admin@test.com', 'Test Admin', Role.ADMIN, null, null),
    user(
      IDS.manager1,
      'manager1@test.com',
      'Manager One',
      Role.MANAGER,
      IDS.teamA,
      null,
    ),
    user(
      IDS.manager2,
      'manager2@test.com',
      'Manager Two',
      Role.MANAGER,
      IDS.teamB,
      null,
    ),
    user(
      IDS.emp1,
      'emp1@test.com',
      'Employee One',
      Role.EMPLOYEE,
      IDS.teamA,
      IDS.manager1,
    ),
    user(
      IDS.emp2,
      'emp2@test.com',
      'Employee Two',
      Role.EMPLOYEE,
      IDS.teamA,
      IDS.manager1,
    ),
    user(
      IDS.emp3,
      'emp3@test.com',
      'Employee Three',
      Role.EMPLOYEE,
      IDS.teamA,
      IDS.manager1,
    ),
    user(
      IDS.emp4,
      'emp4@test.com',
      'Employee Four',
      Role.EMPLOYEE,
      IDS.teamA,
      IDS.manager1,
    ),
    user(
      IDS.emp5,
      'emp5@test.com',
      'Employee Five',
      Role.EMPLOYEE,
      IDS.teamB,
      IDS.manager2,
    ),
  ]);

  teams[0].managerId = IDS.manager1;
  teams[1].managerId = IDS.manager2;
  await teamRepo.save(teams);

  const settingRepo = dataSource.getRepository(SystemSetting);
  await settingRepo.save([
    settingRepo.create({
      key: 'min_notice_days',
      value: '1',
      description: 'Minimum notice days',
    }),
    settingRepo.create({
      key: 'max_team_members_off',
      value: '2',
      description: 'Maximum team members off',
    }),
  ]);

  const holidayRepo = dataSource.getRepository(PublicHoliday);
  await holidayRepo.save(
    holidayRepo.create({ name: 'Test Public Holiday', date: holidayDate }),
  );

  return { holidayDate };
}
