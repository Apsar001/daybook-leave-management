import { ApprovalHistory } from './approval-history.entity';
import { LeaveBalance } from './leave-balance.entity';
import { LeaveRequest } from './leave-request.entity';
import { LeaveType } from './leave-type.entity';
import { Notification } from './notification.entity';
import { PublicHoliday } from './public-holiday.entity';
import { RefreshToken } from './refresh-token.entity';
import { SystemSetting } from './system-setting.entity';
import { Team } from './team.entity';
import { User } from './user.entity';

export * from './user.entity';
export * from './team.entity';
export * from './leave-type.entity';
export * from './leave-request.entity';
export * from './leave-balance.entity';
export * from './public-holiday.entity';
export * from './approval-history.entity';
export * from './system-setting.entity';
export * from './notification.entity';
export * from './refresh-token.entity';

export const allEntities = [
  User,
  Team,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  PublicHoliday,
  ApprovalHistory,
  SystemSetting,
  Notification,
  RefreshToken,
];
