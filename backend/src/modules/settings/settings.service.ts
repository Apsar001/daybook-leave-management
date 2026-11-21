import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SystemSetting } from '../../database/entities/system-setting.entity';

export const SETTING_KEYS = {
  MIN_NOTICE_DAYS: 'min_notice_days',
  MAX_TEAM_MEMBERS_OFF: 'max_team_members_off',
} as const;

export const DEFAULT_SETTINGS = {
  [SETTING_KEYS.MIN_NOTICE_DAYS]: 1,
  [SETTING_KEYS.MAX_TEAM_MEMBERS_OFF]: 2,
} as const;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  private getManager(manager?: EntityManager): Repository<SystemSetting> {
    return manager
      ? manager.getRepository(SystemSetting)
      : this.settingsRepository;
  }

  async getNumber(
    key: string,
    fallback: number,
    manager?: EntityManager,
  ): Promise<number> {
    const setting = await this.getManager(manager).findOne({ where: { key } });
    if (!setting) return fallback;
    const value = Number(setting.value);
    return Number.isFinite(value) ? value : fallback;
  }

  async getMinNoticeDays(manager?: EntityManager): Promise<number> {
    return this.getNumber(
      SETTING_KEYS.MIN_NOTICE_DAYS,
      DEFAULT_SETTINGS[SETTING_KEYS.MIN_NOTICE_DAYS],
      manager,
    );
  }

  async getMaxTeamMembersOff(manager?: EntityManager): Promise<number> {
    return this.getNumber(
      SETTING_KEYS.MAX_TEAM_MEMBERS_OFF,
      DEFAULT_SETTINGS[SETTING_KEYS.MAX_TEAM_MEMBERS_OFF],
      manager,
    );
  }

  async ensureDefaults(manager?: EntityManager): Promise<void> {
    const repository = this.getManager(manager);
    const descriptions: Record<string, string> = {
      [SETTING_KEYS.MIN_NOTICE_DAYS]:
        'Minimum calendar days of notice required before a leave start date',
      [SETTING_KEYS.MAX_TEAM_MEMBERS_OFF]:
        'Maximum number of team members allowed off on the same working day',
    };
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await repository.findOne({ where: { key } });
      if (!existing) {
        await repository.save(
          repository.create({
            key,
            value: String(value),
            description: descriptions[key],
          }),
        );
      }
    }
  }

  async setNumber(
    key: string,
    value: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = this.getManager(manager);
    const existing = await repository.findOne({ where: { key } });
    if (existing) {
      existing.value = String(value);
      await repository.save(existing);
      return;
    }
    await repository.save(repository.create({ key, value: String(value) }));
  }

  async getAll(): Promise<{
    minNoticeDays: number;
    maxTeamMembersOff: number;
    settings: Array<{ key: string; value: string; description: string | null }>;
  }> {
    await this.ensureDefaults();
    const settings = await this.settingsRepository.find({
      order: { key: 'ASC' },
    });
    return {
      minNoticeDays: await this.getMinNoticeDays(),
      maxTeamMembersOff: await this.getMaxTeamMembersOff(),
      settings: settings.map((setting) => ({
        key: setting.key,
        value: setting.value,
        description: setting.description,
      })),
    };
  }
}
