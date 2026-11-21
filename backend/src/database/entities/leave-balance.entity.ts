import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { LeaveType } from './leave-type.entity';

@Entity('leave_balances')
@Unique('UQ_leave_balance_user_type_year', ['userId', 'leaveTypeId', 'year'])
@Index('IDX_leave_balance_user_year', ['userId', 'year'])
@Check(
  'CHK_leave_balance_non_negative',
  '"allowance_days" >= 0 AND "approved_days" >= 0 AND "pending_days" >= 0',
)
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.balances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId: string;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.balances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'allowance_days', type: 'int', default: 0 })
  allowanceDays: number;

  @Column({ name: 'approved_days', type: 'int', default: 0 })
  approvedDays: number;

  @Column({ name: 'pending_days', type: 'int', default: 0 })
  pendingDays: number;

  @Column({ name: 'available_days', type: 'int', default: 0 })
  availableDays: number;

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATABASE_DATE_TIME_TYPE })
  updatedAt: Date;
}
