import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces';
import { UsersService } from './users.service';

class RequestQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/balance')
  @ApiOperation({ summary: 'Get the authenticated user leave balances' })
  balance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: number,
  ) {
    return this.usersService.getBalance(
      user.id,
      year ? Number(year) : undefined,
    );
  }

  @Get('me/requests')
  @ApiOperation({ summary: 'Get the authenticated user leave requests' })
  requests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RequestQuery,
  ) {
    return this.usersService.getRequests(user.id, query.status, query.year);
  }
}
