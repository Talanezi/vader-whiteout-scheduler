import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MeetingReminderJob {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column()
  MeetingID: number;

  @Column()
  RecipientEmail: string;

  @Column()
  RecipientName: string;

  @Column({ type: 'timestamp' })
  SendAfter: Date;

  @Column({ default: false })
  Sent: boolean;
}
