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
import type { AuthenticatedUser } from '../../common/interfaces';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CancelDto } from './dto/decision.dto';
import { LeaveRequestsService } from './leave-requests.service';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new leave request' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the authenticated user’s leave requests' })
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('year') year?: string,
  ) {
    return this.leaveRequestsService.findMine(
      user,
      status,
      year ? Number(year) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one request if the viewer is authorized' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestsService.findOneForViewer(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an eligible request owned by the user' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDto,
  ) {
    return this.leaveRequestsService.cancel(id, user.id, dto);
  }
}
