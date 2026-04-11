import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import RateLimiterModule from '../rate-limiter/rate-limiter.module';
import MailModule from '../mail/mail.module';
import MeetingDeleterService from './meeting-deleter.service';
import MeetingRespondent from './meeting-respondent.entity';
import { MeetingNotificationState } from './meeting-notification-state.entity';
import Meeting from './meeting.entity';
import { MeetingsController } from './meetings.controller';
import MeetingsInternalController from './meetings-internal.controller';
import MeetingsService from './meetings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingRespondent, MeetingNotificationState]),
    MailModule,
    RateLimiterModule,
  ],
  controllers: [MeetingsController, MeetingsInternalController],
  providers: [MeetingsService, MeetingDeleterService],
  exports: [MeetingsService],
})
export default class MeetingsModule {}
