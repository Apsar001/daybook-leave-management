import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseOptions } from './config/database.config';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { LeaveBalanceModule } from './modules/leave-balance/leave-balance.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { ManagerModule } from './modules/manager/manager.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OverlapCheckModule } from './modules/overlap-check/overlap-check.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { WorkingDaysModule } from './modules/working-days/working-days.module';

const globalGuards: Provider[] = [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot(getDatabaseOptions()),
    ThrottlerModule.forRoot([
      {
        ttl: process.env.NODE_ENV === 'test' ? 60_000 : 60_000,
        limit: process.env.NODE_ENV === 'test' ? 10_000 : 20,
      },
    ]),
    SettingsModule,
    WorkingDaysModule,
    LeaveBalanceModule,
    OverlapCheckModule,
    AuthModule,
    UsersModule,
    LeaveRequestsModule,
    ManagerModule,
    CalendarModule,
    AdminModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: globalGuards,
})
export class AppModule {}
