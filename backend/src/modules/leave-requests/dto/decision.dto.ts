import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RejectDto {
  @IsString()
  @IsNotEmpty({ message: 'A rejection comment is required' })
  @MaxLength(500)
  comment: string;
}

export class CancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
