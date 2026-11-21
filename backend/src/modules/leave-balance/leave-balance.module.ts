import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveBalance } from '../../database/entities/leave-balance.entity';
import { WorkingDaysModule } from '../working-days/working-days.module';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveBalance]), WorkingDaysModule],
  providers: [LeaveBalanceService],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
