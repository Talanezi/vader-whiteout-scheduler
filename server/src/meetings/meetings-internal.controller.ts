import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import ConfigService from '../config/config.service';
import MeetingsService from './meetings.service';

@Controller('api/internal')
export default class MeetingsInternalController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('flush-creator-digests')
  async flushCreatorDigests(
    @Headers('x-cron-secret') cronSecret?: string,
  ) {
    const expected = this.configService.get('INTERNAL_CRON_SECRET');
    if (!expected || cronSecret !== expected) {
      throw new ForbiddenException('Invalid cron secret');
    }

    const sent = await this.meetingsService.flushPendingCreatorDigests();
    return { ok: true, sent };
  }
}
