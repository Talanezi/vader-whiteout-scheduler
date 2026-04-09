import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import User from './user.entity';

@Entity()
export class UserTemplate {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ length: 120 })
  Name: string;

  @Column({ type: 'text' })
  SlotsJSON: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserID' })
  User: User;

  @Column()
  UserID: number;

  @CreateDateColumn()
  CreatedAt: Date;

  @UpdateDateColumn()
  UpdatedAt: Date;
}
