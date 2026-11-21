import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: DATABASE_DATE_TIME_TYPE })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: DATABASE_DATE_TIME_TYPE, nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;
}
