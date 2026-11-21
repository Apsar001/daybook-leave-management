import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';
import { LeaveBalance } from './leave-balance.entity';

@Entity('leave_types')
@Check('CHK_leave_types_allowance', '"yearly_allowance" >= 0')
export class LeaveType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'yearly_allowance', type: 'int', default: 0 })
  yearlyAllowance: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: '#4f46e5' })
  color: string;

  @OneToMany(() => LeaveRequest, (request) => request.leaveType)
  requests: LeaveRequest[];

  @OneToMany(() => LeaveBalance, (balance) => balance.leaveType)
  balances: LeaveBalance[];

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATABASE_DATE_TIME_TYPE })
  updatedAt: Date;
}
