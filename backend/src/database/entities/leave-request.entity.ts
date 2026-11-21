import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Check,
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
import { ApprovalAction, LeaveStatus } from '../../common/enums';
import { User } from './user.entity';
import { LeaveType } from './leave-type.entity';
import { ApprovalHistory } from './approval-history.entity';

@Entity('leave_requests')
@Index('IDX_leave_requests_employee_status', ['employeeId', 'status'])
@Index('IDX_leave_requests_dates', ['startDate', 'endDate'])
@Index('IDX_leave_requests_status', ['status'])
@Check('CHK_leave_requests_dates', '"end_date" >= "start_date"')
@Check('CHK_leave_requests_working_days', '"working_days" > 0')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => User, (user) => user.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId: string;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.requests, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'working_days', type: 'int' })
  workingDays: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'simple-enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'decided_at', type: DATABASE_DATE_TIME_TYPE, nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decided_by' })
  decidedBy: User | null;

  @OneToMany(() => ApprovalHistory, (history) => history.request)
  approvalHistory: ApprovalHistory[];

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATABASE_DATE_TIME_TYPE })
  updatedAt: Date;
}

export const ACTIVE_LEAVE_STATUSES = [
  LeaveStatus.PENDING,
  LeaveStatus.APPROVED,
] as const;
export const DECISION_ACTIONS: ApprovalAction[] = [
  ApprovalAction.APPROVED,
  ApprovalAction.REJECTED,
];
