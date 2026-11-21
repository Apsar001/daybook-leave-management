import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID('4', { message: 'leaveTypeId must be a valid UUID' })
  leaveTypeId: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate: string;

  @IsString()
  @IsNotEmpty({ message: 'A reason is required' })
  @Matches(/\S/, { message: 'A reason is required' })
  @MaxLength(1000)
  reason: string;
}
