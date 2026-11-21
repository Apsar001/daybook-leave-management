import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalHistory } from '../../database/entities/approval-history.entity';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { LeaveType } from '../../database/entities/leave-type.entity';
import { Notification } from '../../database/entities/notification.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceModule } from '../leave-balance/leave-balance.module';
import { OverlapCheckModule } from '../overlap-check/overlap-check.module';
import { SettingsModule } from '../settings/settings.module';
import { WorkingDaysModule } from '../working-days/working-days.module';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      LeaveType,
      PublicHoliday,
      User,
      ApprovalHistory,
      Notification,
    ]),
    WorkingDaysModule,
    LeaveBalanceModule,
    OverlapCheckModule,
    SettingsModule,
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
