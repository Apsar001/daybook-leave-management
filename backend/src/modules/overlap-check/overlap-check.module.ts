import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { OverlapCheckService } from './overlap-check.service';

@Module({
  imports: [SettingsModule],
  providers: [OverlapCheckService],
  exports: [OverlapCheckService],
})
export class OverlapCheckModule {}
