import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import type { AuthenticatedUser } from '../../common/interfaces';
import { ApproveDto, RejectDto } from '../leave-requests/dto/decision.dto';
import { ManagerService } from './manager.service';

@ApiTags('Manager')
@ApiBearerAuth()
@Roles(Role.MANAGER)
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('team')
  @ApiOperation({
    summary: 'List employees reporting to the authenticated manager',
  })
  team(@CurrentUser() user: AuthenticatedUser) {
    return this.managerService.getTeam(user.id);
  }

  @Get('pending-requests')
  @ApiOperation({
    summary: 'List pending requests from the manager’s own reports',
  })
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.managerService.getPendingRequests(user.id);
  }

  @Get('team-history')
  @ApiOperation({ summary: 'List the team’s leave history' })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('year') year?: string,
  ) {
    return this.managerService.getTeamHistory(
      user.id,
      status,
      year ? Number(year) : undefined,
    );
  }

  @Get('availability')
  @ApiOperation({ summary: 'Show team availability for a date' })
  availability(
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managerService.getAvailability(user.id, date);
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve a pending request from an own report' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDto,
  ) {
    return this.managerService.decide(
      id,
      user.id,
      'APPROVED',
      dto.comment ?? null,
    );
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject a pending request from an own report' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
  ) {
    return this.managerService.decide(id, user.id, 'REJECTED', dto.comment);
  }
}
