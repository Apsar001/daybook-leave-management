import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { AdminService } from './admin.service';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get system configuration' })
  settings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system configuration' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('leave-types')
  @ApiOperation({ summary: 'List all leave types' })
  leaveTypes() {
    return this.adminService.getLeaveTypes();
  }

  @Post('leave-types')
  @ApiOperation({ summary: 'Create a leave type' })
  createLeaveType(@Body() dto: CreateLeaveTypeDto) {
    return this.adminService.createLeaveType(dto);
  }

  @Put('leave-types/:id')
  @ApiOperation({ summary: 'Update a leave type' })
  updateLeaveType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.adminService.updateLeaveType(id, dto);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'List public holidays' })
  holidays() {
    return this.adminService.getHolidays();
  }

  @Post('holidays')
  @ApiOperation({ summary: 'Add a public holiday' })
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.adminService.createHoliday(dto);
  }

  @Delete('holidays/:id')
  @ApiOperation({ summary: 'Delete a public holiday' })
  deleteHoliday(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteHoliday(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get system-wide leave statistics' })
  statistics() {
    return this.adminService.getStatistics();
  }

  @Get('teams')
  @ApiOperation({ summary: 'List teams and their coverage' })
  teams() {
    return this.adminService.getTeams();
  }
}
