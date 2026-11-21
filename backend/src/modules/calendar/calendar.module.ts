import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { PublicHoliday } from '../../database/entities/public-holiday.entity';
import { User } from '../../database/entities/user.entity';
import { WorkingDaysModule } from '../working-days/working-days.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, PublicHoliday, User]),
    WorkingDaysModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
