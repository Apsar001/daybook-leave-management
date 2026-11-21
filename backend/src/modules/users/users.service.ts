import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { currentYear } from '../../common/date.util';
import { LeaveRequest } from '../../database/entities/leave-request.entity';
import { User } from '../../database/entities/user.entity';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { mapLeaveRequest } from '../leave-requests/leave-request.mapper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LeaveRequest)
    private readonly requests: Repository<LeaveRequest>,
    private readonly balanceService: LeaveBalanceService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .leftJoinAndSelect('user.manager', 'manager')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      managerId: user.managerId,
      managerName: user.manager?.fullName ?? null,
      createdAt: user.createdAt,
    };
  }

  getBalance(userId: string, year?: number) {
    return this.balanceService.getBalances(userId, year ?? currentYear());
  }

  async getRequests(userId: string, status?: string, year?: number) {
    const query = this.requests
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.team', 'team')
      .leftJoinAndSelect('request.approvalHistory', 'history')
      .leftJoinAndSelect('history.actor', 'actor')
      .where('request.employeeId = :userId', { userId })
      .orderBy('request.createdAt', 'DESC');

    if (status) query.andWhere('request.status = :status', { status });
    if (year) {
      query.andWhere('request.startDate BETWEEN :start AND :end', {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      });
    }
    const requests = await query.getMany();
    return requests.map(mapLeaveRequest);
  }
}
