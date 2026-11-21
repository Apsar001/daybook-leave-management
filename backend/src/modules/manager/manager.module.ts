import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceModule } from '../leave-balance/leave-balance.module';
import { LeaveRequestsModule } from '../leave-requests/leave-requests.module';
import { OverlapCheckModule } from '../overlap-check/overlap-check.module';
import { WorkingDaysModule } from '../working-days/working-days.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, LeaveRequest]),
    LeaveBalanceModule,
    LeaveRequestsModule,
    OverlapCheckModule,
    WorkingDaysModule,
  ],
  controllers: [ManagerController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}
