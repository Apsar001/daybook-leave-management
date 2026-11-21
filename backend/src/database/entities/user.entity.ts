import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums';
import { Team } from './team.entity';
import { LeaveRequest } from './leave-request.entity';
import { LeaveBalance } from './leave-balance.entity';
import { RefreshToken } from './refresh-token.entity';
import { Notification } from './notification.entity';
import { ApprovalHistory } from './approval-history.entity';

@Entity('users')
@Index('IDX_users_role', ['role'])
@Index('IDX_users_manager', ['managerId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'simple-enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string | null;

  @ManyToOne(() => Team, (team) => team.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team: Team | null;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @ManyToOne(() => User, (user) => user.managedReports, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.manager)
  managedReports: User[];

  @OneToMany(() => Team, (team) => team.manager)
  managedTeam: Team[];

  @OneToMany(() => LeaveRequest, (request) => request.employee)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => LeaveBalance, (balance) => balance.user)
  balances: LeaveBalance[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => ApprovalHistory, (history) => history.actor)
  approvalActions: ApprovalHistory[];

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATABASE_DATE_TIME_TYPE })
  updatedAt: Date;
}
