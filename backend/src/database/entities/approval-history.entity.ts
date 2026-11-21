import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApprovalAction } from '../../common/enums';
import { LeaveRequest } from './leave-request.entity';
import { User } from './user.entity';

@Entity('approval_history')
export class ApprovalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => LeaveRequest, (request) => request.approvalHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: LeaveRequest;

  @Column({ type: 'simple-enum', enum: ApprovalAction })
  action: ApprovalAction;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, (user) => user.approvalActions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;
}
