import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { LeaveType } from '../../database/entities/leave-type.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { Team } from '../../database/entities/team.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceModule } from '../leave-balance/leave-balance.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LeaveTypesController } from './leave-types.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveType,
      PublicHoliday,
      User,
      Team,
      LeaveRequest,
    ]),
    SettingsModule,
    LeaveBalanceModule,
  ],
  controllers: [AdminController, LeaveTypesController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
