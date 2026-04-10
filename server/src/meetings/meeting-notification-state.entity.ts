import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class MeetingNotificationState {
  @PrimaryColumn()
  MeetingID: number;

  @Column({ type: 'timestamp', nullable: true })
  CreatorDigestPendingSince: Date | null;

  @Column({ type: 'text', default: '[]' })
  PendingRespondentNamesJSON: string;
}
