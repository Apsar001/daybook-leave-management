import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  currentYear,
  isValidISODate,
  normalizeDate,
} from '../../common/date.util';
import { LeaveStatus, Role } from '../../common/enums';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { LeaveType } from '../../database/entities/leave-type.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { Team } from '../../database/entities/team.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { SettingsService, SETTING_KEYS } from '../settings/settings.service';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(LeaveType)
    private readonly leaveTypes: Repository<LeaveType>,
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(LeaveRequest)
    private readonly requests: Repository<LeaveRequest>,
    private readonly settingsService: SettingsService,
    private readonly balanceService: LeaveBalanceService,
    private readonly dataSource: DataSource,
  ) {}

  getSettings() {
    return this.settingsService.getAll();
  }

  async updateSettings(dto: UpdateSettingsDto) {
    await this.settingsService.ensureDefaults();
    await this.dataSource.transaction(async (manager) => {
      if (dto.minNoticeDays !== undefined) {
        await this.settingsService.setNumber(
          SETTING_KEYS.MIN_NOTICE_DAYS,
          dto.minNoticeDays,
          manager,
        );
      }
      if (dto.maxTeamMembersOff !== undefined) {
        await this.settingsService.setNumber(
          SETTING_KEYS.MAX_TEAM_MEMBERS_OFF,
          dto.maxTeamMembersOff,
          manager,
        );
      }
    });
    return this.settingsService.getAll();
  }

  async getLeaveTypes(activeOnly = false): Promise<LeaveType[]> {
    return this.leaveTypes.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { name: 'ASC' },
    });
  }

  async createLeaveType(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    const existing = await this.leaveTypes.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing)
      throw new ConflictException('A leave type with this name already exists');
    const leaveType = this.leaveTypes.create({
      name: dto.name.trim(),
      description: dto.description ?? null,
      yearlyAllowance: dto.yearlyAllowance,
      isActive: dto.isActive ?? true,
      color: dto.color ?? '#4f46e5',
    });
    return this.leaveTypes.save(leaveType);
  }

  async updateLeaveType(
    id: string,
    dto: UpdateLeaveTypeDto,
  ): Promise<LeaveType> {
    const leaveType = await this.leaveTypes.findOne({ where: { id } });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (dto.name && dto.name.trim() !== leaveType.name) {
      const duplicate = await this.leaveTypes.findOne({
        where: { name: dto.name.trim() },
      });
      if (duplicate)
        throw new ConflictException(
          'A leave type with this name already exists',
        );
      leaveType.name = dto.name.trim();
    }
    if (dto.description !== undefined) leaveType.description = dto.description;
    if (dto.isActive !== undefined) leaveType.isActive = dto.isActive;
    if (dto.color !== undefined) leaveType.color = dto.color;

    const allowanceChanged =
      dto.yearlyAllowance !== undefined &&
      dto.yearlyAllowance !== leaveType.yearlyAllowance;
    if (dto.yearlyAllowance !== undefined)
      leaveType.yearlyAllowance = dto.yearlyAllowance;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(LeaveType).save(leaveType);
      if (allowanceChanged && dto.yearlyAllowance !== undefined) {
        await this.balanceService.syncAllowanceForType(
          id,
          dto.yearlyAllowance,
          manager,
        );
        await this.balanceService.recalculateAllUsersForYear(
          currentYear(),
          manager,
        );
      }
    });

    return this.leaveTypes.findOne({ where: { id } }) as Promise<LeaveType>;
  }

  async getHolidays(): Promise<PublicHoliday[]> {
    return this.holidays.find({ order: { date: 'ASC' } });
  }

  async createHoliday(dto: CreateHolidayDto): Promise<PublicHoliday> {
    if (!isValidISODate(dto.date))
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    const date = normalizeDate(dto.date);
    const existing = await this.holidays.findOne({ where: { date } });
    if (existing)
      throw new ConflictException(
        'A public holiday already exists on this date',
      );
    return this.holidays.save(
      this.holidays.create({ name: dto.name.trim(), date }),
    );
  }

  async deleteHoliday(id: string): Promise<{ success: boolean }> {
    const holiday = await this.holidays.findOne({ where: { id } });
    if (!holiday) throw new NotFoundException('Public holiday not found');
    await this.holidays.remove(holiday);
    return { success: true };
  }

  async getStatistics() {
    const roles = await this.users
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.isActive = :active', { active: true })
      .groupBy('user.role')
      .getRawMany<{ role: Role; count: string | number }>();
    const byRole = Object.fromEntries(
      roles.map((row) => [row.role, Number(row.count)]),
    ) as Partial<Record<Role, number>>;

    const statuses = await this.requests
      .createQueryBuilder('request')
      .select('request.status', 'status')
      .addSelect('COUNT(request.id)', 'count')
      .groupBy('request.status')
      .getRawMany<{ status: LeaveStatus; count: string | number }>();
    const byStatus = Object.fromEntries(
      statuses.map((row) => [row.status, Number(row.count)]),
    ) as Partial<Record<LeaveStatus, number>>;

    const leaveTypes = await this.leaveTypes.find({ order: { name: 'ASC' } });
    return {
      totalEmployees: byRole[Role.EMPLOYEE] ?? 0,
      totalManagers: byRole[Role.MANAGER] ?? 0,
      totalAdmins: byRole[Role.ADMIN] ?? 0,
      pendingRequests: byStatus[LeaveStatus.PENDING] ?? 0,
      approvedRequests: byStatus[LeaveStatus.APPROVED] ?? 0,
      rejectedRequests: byStatus[LeaveStatus.REJECTED] ?? 0,
      cancelledRequests: byStatus[LeaveStatus.CANCELLED] ?? 0,
      totalTeams: await this.teams.count(),
      leaveTypes: leaveTypes.map((type) => ({
        id: type.id,
        name: type.name,
        yearlyAllowance: type.yearlyAllowance,
        isActive: type.isActive,
      })),
    };
  }

  async getTeams() {
    const teams = await this.teams.find({
      relations: { manager: true },
      order: { name: 'ASC' },
    });
    return Promise.all(
      teams.map(async (team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: await this.users.count({
          where: { teamId: team.id, isActive: true },
        }),
        manager: team.manager
          ? { id: team.manager.id, fullName: team.manager.fullName }
          : null,
      })),
    );
  }
}
