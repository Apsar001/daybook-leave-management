import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Minimum notice days cannot be negative' })
  @Max(365)
  minNoticeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'At least one team member must be allowed off' })
  @Max(100)
  maxTeamMembersOff?: number;
}
