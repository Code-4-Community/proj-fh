import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

import type { Status } from './types';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  status: Status;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;
}
