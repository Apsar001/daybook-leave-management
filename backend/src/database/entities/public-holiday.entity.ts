import { DATABASE_DATE_TIME_TYPE } from '../../config/env';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('public_holidays')
export class PublicHoliday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'date', unique: true })
  date: string;

  @CreateDateColumn({ name: 'created_at', type: DATABASE_DATE_TIME_TYPE })
  createdAt: Date;
}
