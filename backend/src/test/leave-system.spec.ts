import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { addCalendarDays } from '../common/date.util';
import { WorkingDaysService } from '../modules/working-days/working-days.service';
import {
  IDS,
  pickWeekday,
  pickWorkday,
  seedTestData,
  TEST_PASSWORD,
} from './fixtures';

describe('Leave Management System (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokens: Record<string, string>;
  let holidayDate: string;

  const api = () => request(app.getHttpServer());

  const loginAs = async (
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api()
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });
    expect(response.status).toBe(201);
    return {
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
    };
  };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createLeave = (
    token: string,
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    reason = 'Test leave request',
  ) =>
    api()
      .post('/api/leave-requests')
      .set(auth(token))
      .send({ leaveTypeId, startDate, endDate, reason });

  const balanceFor = async (token: string, name: string) => {
    const response = await api().get('/api/users/me/balance').set(auth(token));
    expect(response.status).toBe(200);
    const balance = response.body.find(
      (item: { name: string }) => item.name === name,
    );
    expect(balance).toBeDefined();
    return balance;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    ({ holidayDate } = await seedTestData(dataSource));
    const logins = await Promise.all([
      loginAs('admin@test.com'),
      loginAs('manager1@test.com'),
      loginAs('manager2@test.com'),
      loginAs('emp1@test.com'),
      loginAs('emp2@test.com'),
      loginAs('emp3@test.com'),
      loginAs('emp4@test.com'),
      loginAs('emp5@test.com'),
    ]);
    tokens = {
      admin: logins[0].accessToken,
      manager1: logins[1].accessToken,
      manager2: logins[2].accessToken,
      emp1: logins[3].accessToken,
      emp2: logins[4].accessToken,
      emp3: logins[5].accessToken,
      emp4: logins[6].accessToken,
      emp5: logins[7].accessToken,
    };
  });

  it('1. authenticates a valid user and returns both tokens', async () => {
    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'emp1@test.com', password: TEST_PASSWORD });
    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.role).toBe('EMPLOYEE');
  });

  it('2. rejects invalid login credentials', async () => {
    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'emp1@test.com', password: 'WrongPassword1!' });
    expect(response.status).toBe(401);
  });

  it('3. denies an employee access to admin configuration APIs', async () => {
    const response = await api()
      .get('/api/admin/settings')
      .set(auth(tokens.emp1));
    expect(response.status).toBe(403);
  });

  it('4. denies an employee permission to approve leave', async () => {
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      pickWorkday(7),
      pickWorkday(9),
    );
    const response = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.emp1))
      .send({ comment: 'self approval' });
    expect(response.status).toBe(403);
  });

  it('5. lets a manager view only their own reporting employees', async () => {
    const response = await api()
      .get('/api/manager/team')
      .set(auth(tokens.manager1));
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(
      response.body.map((member: { email: string }) => member.email),
    ).toContain('emp1@test.com');
    expect(
      response.body.map((member: { email: string }) => member.email),
    ).not.toContain('emp5@test.com');
  });

  it('6. prevents a manager from approving another manager’s report', async () => {
    const created = await createLeave(
      tokens.emp5,
      IDS.annual,
      pickWorkday(7, [holidayDate]),
      pickWorkday(9, [holidayDate]),
    );
    expect(created.status).toBe(201);
    const response = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(response.status).toBe(403);
  });

  it('7. accepts a valid leave request and calculates working days', async () => {
    const start = pickWeekday(5, 14, [holidayDate]);
    const end = addCalendarDays(start, 3);
    const response = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      end,
      'Short break',
    );
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING');
    expect(response.body.workingDays).toBe(2);
    expect(response.body.reason).toBe('Short break');
  });

  it('8. rejects an end date before the start date', async () => {
    const start = pickWorkday(10, [holidayDate]);
    const response = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, -1),
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain(
      'End date cannot be before',
    );
  });

  it('9. excludes Saturdays and Sundays from working-day calculation', () => {
    const service = new WorkingDaysService();
    expect(service.countWorkingDays('2026-11-20', '2026-11-24', [])).toBe(3);
    expect(service.countWorkingDays('2026-11-21', '2026-11-22', [])).toBe(0);
  });

  it('10. excludes public holidays without double-counting them', () => {
    const service = new WorkingDaysService();
    expect(
      service.countWorkingDays('2026-11-20', '2026-11-24', ['2026-11-23']),
    ).toBe(2);
    expect(
      service.countWorkingDays('2026-11-23', '2026-11-24', ['2026-11-23']),
    ).toBe(1);
  });

  it('11. rejects a range containing zero working days', async () => {
    const saturday = pickWeekday(6, 14, [holidayDate]);
    const response = await createLeave(
      tokens.emp1,
      IDS.annual,
      saturday,
      addCalendarDays(saturday, 1),
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('no working days');
  });

  it('12. rejects a request that exceeds the available balance', async () => {
    await api()
      .put(`/api/admin/leave-types/${IDS.annual}`)
      .set(auth(tokens.admin))
      .send({ yearlyAllowance: 1 });
    const start = pickWeekday(5, 14, [holidayDate]);
    const response = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 3),
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('Insufficient');
  });

  it('13. counts pending leave against the available balance', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    expect(created.status).toBe(201);
    const balance = await balanceFor(tokens.emp1, 'Annual Leave');
    expect(balance.pendingDays).toBe(2);
    expect(balance.approvedDays).toBe(0);
    expect(balance.availableDays).toBe(18);
  });

  it('14. moves reserved days from pending to approved without double deduction', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    const approved = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({ comment: 'Approved' });
    expect(approved.status).toBe(201);
    const balance = await balanceFor(tokens.emp1, 'Annual Leave');
    expect(balance.pendingDays).toBe(0);
    expect(balance.approvedDays).toBe(2);
    expect(balance.availableDays).toBe(18);
  });

  it('15. excludes rejected leave from balance consumption', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    const rejected = await api()
      .post(`/api/manager/requests/${created.body.id}/reject`)
      .set(auth(tokens.manager1))
      .send({ comment: 'Coverage conflict' });
    expect(rejected.status).toBe(201);
    const balance = await balanceFor(tokens.emp1, 'Annual Leave');
    expect(balance.pendingDays).toBe(0);
    expect(balance.approvedDays).toBe(0);
    expect(balance.availableDays).toBe(20);
  });

  it('16. detects overlapping active requests for the same employee', async () => {
    const start = pickWorkday(9, [holidayDate]);
    const first = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 2),
    );
    expect(first.status).toBe(201);
    const second = await createLeave(
      tokens.emp1,
      IDS.sick,
      start,
      addCalendarDays(start, 1),
    );
    expect(second.status).toBe(400);
    expect(JSON.stringify(second.body.message)).toContain('Overlapping');
  });

  it('17. enforces the configured maximum team members off on a date', async () => {
    const date = pickWorkday(10, [holidayDate]);
    expect(
      (await createLeave(tokens.emp1, IDS.annual, date, date)).status,
    ).toBe(201);
    expect(
      (await createLeave(tokens.emp2, IDS.annual, date, date)).status,
    ).toBe(201);
    const third = await createLeave(tokens.emp3, IDS.annual, date, date);
    expect(third.status).toBe(400);
    expect(JSON.stringify(third.body.message)).toContain('Team coverage limit');
  });

  it('18. enforces the minimum notice period', async () => {
    await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ minNoticeDays: 10 });
    const response = await createLeave(
      tokens.emp1,
      IDS.annual,
      pickWorkday(2, [holidayDate]),
      pickWorkday(4, [holidayDate]),
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain(
      'at least 10 calendar day',
    );
  });

  it('19. restores balance when an employee cancels a pending request', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    const cancelled = await api()
      .post(`/api/leave-requests/${created.body.id}/cancel`)
      .set(auth(tokens.emp1))
      .send({ comment: 'Plans changed' });
    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('CANCELLED');
    const balance = await balanceFor(tokens.emp1, 'Annual Leave');
    expect(balance.pendingDays).toBe(0);
    expect(balance.availableDays).toBe(20);
  });

  it('20. rejects cancellation of an already rejected request', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    await api()
      .post(`/api/manager/requests/${created.body.id}/reject`)
      .set(auth(tokens.manager1))
      .send({ comment: 'Not approved' });
    const response = await api()
      .post(`/api/leave-requests/${created.body.id}/cancel`)
      .set(auth(tokens.emp1))
      .send({});
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain(
      'cannot be cancelled',
    );
  });

  it('21. rejects duplicate approval transitions', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    const first = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(first.status).toBe(201);
    const second = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(second.status).toBe(400);
    expect(JSON.stringify(second.body.message)).toContain('Only PENDING');
  });

  it('22. lets an admin change the yearly allowance and affects balances', async () => {
    const response = await api()
      .put(`/api/admin/leave-types/${IDS.annual}`)
      .set(auth(tokens.admin))
      .send({ yearlyAllowance: 5 });
    expect(response.status).toBe(200);
    expect(response.body.yearlyAllowance).toBe(5);
    const balance = await balanceFor(tokens.emp1, 'Annual Leave');
    expect(balance.allowanceDays).toBe(5);
    expect(balance.availableDays).toBe(5);
  });

  it('23. lets an admin change the minimum notice days', async () => {
    const response = await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ minNoticeDays: 7 });
    expect(response.status).toBe(200);
    expect(response.body.minNoticeDays).toBe(7);
  });

  it('24. lets an admin change the maximum team members off', async () => {
    const response = await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ maxTeamMembersOff: 1 });
    expect(response.status).toBe(200);
    expect(response.body.maxTeamMembersOff).toBe(1);
  });

  it('25. applies updated configuration to real validation on subsequent requests', async () => {
    const date = pickWorkday(20, [holidayDate]);
    await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ maxTeamMembersOff: 1 });
    expect(
      (await createLeave(tokens.emp1, IDS.annual, date, date)).status,
    ).toBe(201);
    const coverage = await createLeave(tokens.emp2, IDS.annual, date, date);
    expect(coverage.status).toBe(400);

    await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ minNoticeDays: 10 });
    const notice = await createLeave(
      tokens.emp3,
      IDS.annual,
      pickWorkday(2, [holidayDate]),
      pickWorkday(3, [holidayDate]),
    );
    expect(notice.status).toBe(400);

    await api()
      .put(`/api/admin/leave-types/${IDS.annual}`)
      .set(auth(tokens.admin))
      .send({ yearlyAllowance: 1 });
    const friday = pickWeekday(5, 25, [holidayDate]);
    const allowance = await createLeave(
      tokens.emp4,
      IDS.annual,
      friday,
      addCalendarDays(friday, 3),
    );
    expect(allowance.status).toBe(400);
    expect(JSON.stringify(allowance.body.message)).toContain('Insufficient');
  });

  it('26. rotates refresh tokens and revokes them on logout', async () => {
    const login = await loginAs('emp1@test.com');
    const refreshed = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: login.refreshToken });
    expect(refreshed.status).toBe(201);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    const me = await api()
      .get('/api/auth/me')
      .set(auth(refreshed.body.accessToken));
    expect(me.status).toBe(200);

    await api()
      .post('/api/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken });
    const reused = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(reused.status).toBe(401);
  });

  it('27. rejects requests without an access token', async () => {
    const response = await api().get('/api/users/me');
    expect(response.status).toBe(401);
  });

  it('28. prevents an employee from viewing another employee’s request', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(tokens.emp1, IDS.annual, start, start);
    const response = await api()
      .get(`/api/leave-requests/${created.body.id}`)
      .set(auth(tokens.emp2));
    expect(response.status).toBe(403);
  });

  it('29. records a complete approval audit trail', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(tokens.emp1, IDS.annual, start, start);
    const approved = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({ comment: 'Looks good' });
    expect(approved.status).toBe(201);
    const history = approved.body.approvalHistory;
    expect(history).toHaveLength(2);
    expect(history.map((item: { action: string }) => item.action)).toEqual([
      'SUBMITTED',
      'APPROVED',
    ]);
    expect(history[1].comment).toBe('Looks good');
    expect(history[1].actor.fullName).toBe('Manager One');
  });

  it('30. prevents a manager from querying another team’s calendar', async () => {
    const now = new Date();
    const response = await api()
      .get(
        `/api/calendar?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}&teamId=${IDS.teamB}`,
      )
      .set(auth(tokens.manager1));
    expect(response.status).toBe(403);
  });

  it('31. enforces the configurable unpaid-leave allowance policy', async () => {
    await api()
      .put(`/api/admin/leave-types/${IDS.unpaid}`)
      .set(auth(tokens.admin))
      .send({ yearlyAllowance: 1 });
    const friday = pickWeekday(5, 18, [holidayDate]);
    const response = await createLeave(
      tokens.emp1,
      IDS.unpaid,
      friday,
      addCalendarDays(friday, 3),
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain(
      'Insufficient Unpaid Leave',
    );
  });

  it('32. returns a monthly calendar with holidays and authorized employee names', async () => {
    const date = pickWorkday(8, [holidayDate]);
    const created = await createLeave(tokens.emp1, IDS.annual, date, date);
    expect(created.status).toBe(201);

    const requestDate = new Date(`${date}T00:00:00.000Z`);
    const calendarResponse = await api()
      .get(
        `/api/calendar?year=${requestDate.getUTCFullYear()}&month=${requestDate.getUTCMonth() + 1}`,
      )
      .set(auth(tokens.manager1));
    expect(calendarResponse.status).toBe(200);
    expect(
      calendarResponse.body.requests.some(
        (item: { employee: { fullName: string } }) =>
          item.employee.fullName === 'Employee One',
      ),
    ).toBe(true);

    const holiday = new Date(`${holidayDate}T00:00:00.000Z`);
    const holidayResponse = await api()
      .get(
        `/api/calendar?year=${holiday.getUTCFullYear()}&month=${holiday.getUTCMonth() + 1}`,
      )
      .set(auth(tokens.manager1));
    expect(holidayResponse.status).toBe(200);
    expect(
      holidayResponse.body.holidays.some(
        (item: { date: string }) => item.date === holidayDate,
      ),
    ).toBe(true);
  });

  it('33. rejects cancellation of a request that has already started', async () => {
    const today = new Date();
    const yesterday = addCalendarDays(
      new Date().toISOString().slice(0, 10),
      -1,
    );
    const requestRepo = dataSource.getRepository('LeaveRequest');
    const created = await requestRepo.save(
      requestRepo.create({
        employeeId: IDS.emp1,
        leaveTypeId: IDS.annual,
        startDate: yesterday,
        endDate: yesterday,
        workingDays: 1,
        reason: 'Past request',
        status: 'APPROVED',
      }),
    );
    expect(today).toBeDefined();
    const response = await api()
      .post(`/api/leave-requests/${created.id}/cancel`)
      .set(auth(tokens.emp1))
      .send({});
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('already started');
  });

  it('34. re-checks team coverage at approval time after the limit is lowered', async () => {
    const date = pickWorkday(10, [holidayDate]);
    expect(
      (await createLeave(tokens.emp1, IDS.annual, date, date)).status,
    ).toBe(201);
    expect(
      (await createLeave(tokens.emp2, IDS.annual, date, date)).status,
    ).toBe(201);

    await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ maxTeamMembersOff: 1 });

    const mine = await api()
      .get('/api/users/me/requests')
      .set(auth(tokens.emp1));
    const pending = mine.body.find(
      (item: { status: string }) => item.status === 'PENDING',
    );
    const approval = await api()
      .post(`/api/manager/requests/${pending.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(approval.status).toBe(400);
    expect(JSON.stringify(approval.body.message)).toContain(
      'Team coverage limit',
    );
  });

  it('35. re-checks the allowance at approval time after it is reduced', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      start,
      addCalendarDays(start, 1),
    );
    expect(created.status).toBe(201);

    await api()
      .put(`/api/admin/leave-types/${IDS.annual}`)
      .set(auth(tokens.admin))
      .send({ yearlyAllowance: 1 });

    const approval = await api()
      .post(`/api/manager/requests/${created.body.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(approval.status).toBe(400);
    expect(JSON.stringify(approval.body.message)).toContain('no longer covers');
  });

  it('36. rejects approval of a request that has already started', async () => {
    const yesterday = addCalendarDays(
      new Date().toISOString().slice(0, 10),
      -1,
    );
    const requestRepo = dataSource.getRepository('LeaveRequest');
    const created = await requestRepo.save(
      requestRepo.create({
        employeeId: IDS.emp1,
        leaveTypeId: IDS.annual,
        startDate: yesterday,
        endDate: yesterday,
        workingDays: 1,
        reason: 'Past request',
        status: 'PENDING',
      }),
    );
    const response = await api()
      .post(`/api/manager/requests/${created.id}/approve`)
      .set(auth(tokens.manager1))
      .send({});
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('already started');
  });

  it('37. splits a year-crossing request between both calendar years', async () => {
    await api()
      .put('/api/admin/settings')
      .set(auth(tokens.admin))
      .send({ minNoticeDays: 0 });
    const year = new Date().getUTCFullYear();
    const workingDaysService = new WorkingDaysService();
    const dates = workingDaysService.getWorkingDates(
      `${year}-12-28`,
      `${year + 1}-01-07`,
      [holidayDate],
    );
    const expectedCurrent = dates.filter(
      (date) => date <= `${year}-12-31`,
    ).length;
    const expectedNext = dates.filter(
      (date) => date >= `${year + 1}-01-01`,
    ).length;

    const created = await createLeave(
      tokens.emp1,
      IDS.annual,
      dates[0],
      dates[dates.length - 1],
    );
    expect(created.status).toBe(201);
    expect(created.body.workingDays).toBe(dates.length);

    const current = await api()
      .get(`/api/users/me/balance?year=${year}`)
      .set(auth(tokens.emp1));
    expect(current.status).toBe(200);
    expect(
      current.body.find(
        (item: { name: string }) => item.name === 'Annual Leave',
      ).pendingDays,
    ).toBe(expectedCurrent);

    const next = await api()
      .get(`/api/users/me/balance?year=${year + 1}`)
      .set(auth(tokens.emp1));
    expect(next.status).toBe(200);
    expect(
      next.body.find((item: { name: string }) => item.name === 'Annual Leave')
        .pendingDays,
    ).toBe(expectedNext);
  });

  it('38. rejects a whitespace-only reason', async () => {
    const start = pickWorkday(8, [holidayDate]);
    const response = await api()
      .post('/api/leave-requests')
      .set(auth(tokens.emp1))
      .send({
        leaveTypeId: IDS.annual,
        startDate: start,
        endDate: start,
        reason: '   ',
      });
    expect(response.status).toBe(400);
  });

  it('39. revokes the whole token family when a rotated refresh token is replayed', async () => {
    const first = await loginAs('emp1@test.com');
    const second = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(second.status).toBe(201);
    const third = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: second.body.refreshToken });
    expect(third.status).toBe(201);

    const replay = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);

    const revokedFamily = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: third.body.refreshToken });
    expect(revokedFamily.status).toBe(401);
  });
});
