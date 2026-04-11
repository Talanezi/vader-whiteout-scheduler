import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import ShortUniqueId from 'short-unique-id';
import { LessThanOrEqual, Repository } from 'typeorm';
import ConfigService from '../config/config.service';
import type { DatabaseType } from '../config/env.validation';
import MailService from '../mail/mail.service';
import { emailShell, escapeHtml } from '../mail/mail-template.utils';
import { assert } from '../misc.utils';
import OAuth2Service from '../oauth2/oauth2.service';
import User from '../users/user.entity';
import UsersService from '../users/users.service';
import MeetingRespondent from './meeting-respondent.entity';
import { MeetingNotificationState } from './meeting-notification-state.entity';
import Meeting from './meeting.entity';
import { NoSuchMeetingError, NoSuchRespondentError, createPublicMeetingURL } from './meetings.utils';

const generateSlug = new ShortUniqueId({ length: 12 });

function formatScheduledTimeRange(
  startDateTime: string,
  endDateTime: string,
  tz: string,
): {
  dayString: string;
  timeRangeString: string;
} {
  const startDate = DateTime.fromISO(startDateTime).setZone(tz);
  // See https://moment.github.io/luxon/#/formatting?id=table-of-tokens
  // We want e.g. "8:00AM"
  const startTime = startDate.toFormat('h:mma');
  const endTime = DateTime.fromISO(endDateTime).setZone(tz).toFormat('h:mma');
  const tzShort = startDate.offsetNameShort;
  return {
    // See https://moment.github.io/luxon/#/formatting?id=presets
    // Looks like e.g. "Wednesday, December 21, 2022"
    dayString: startDate.toLocaleString(DateTime.DATE_HUGE),
    timeRangeString: `${startTime} to ${endTime} ${tzShort}`,
  };
}

@Injectable()
export default class MeetingsService {
  private oauth2Service: OAuth2Service;
  private usersService: UsersService;
  private readonly publicURL: string;
  private readonly dbType: DatabaseType;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    @InjectRepository(MeetingRespondent)
    private respondentsRepository: Repository<MeetingRespondent>,
    @InjectRepository(MeetingNotificationState)
    private meetingNotificationStateRepository: Repository<MeetingNotificationState>,
    private readonly mailService: MailService,
    private moduleRef: ModuleRef,
    configService: ConfigService,
  ) {
    this.publicURL = configService.get('FRONTEND_PUBLIC_URL') || configService.get('PUBLIC_URL');
    this.dbType = configService.get('DATABASE_TYPE');
  }

  onModuleInit() {
    // circular dependencies
    this.oauth2Service = this.moduleRef.get(OAuth2Service, { strict: false });
    this.usersService = this.moduleRef.get(UsersService, { strict: false });
  }

  createMeeting(partialMeeting: Partial<Meeting>): Promise<Meeting> {
    partialMeeting.Slug = generateSlug();
    return this.meetingsRepository.save(partialMeeting);
  }

  async getMeetingOrThrow(meetingSlug: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOneBy({
      Slug: meetingSlug,
    });
    if (!meeting) {
      throw new NoSuchMeetingError();
    }
    return meeting;
  }

  getAllMeetings(): Promise<Meeting[]> {
    return this.meetingsRepository.find({
      relations: {
        Creator: true,
      },
      order: {
        ScheduledStartDateTime: "DESC",
        ID: "DESC",
      },
    });
  }

  private _getMeetingWithRespondents() {
    return this.meetingsRepository
      .createQueryBuilder()
      .leftJoin('Meeting.Respondents', 'MeetingRespondent')
      .leftJoin('MeetingRespondent.User', 'User')
      .leftJoin('Meeting.Creator', 'Creator')
      .select([
        'Meeting',
        'MeetingRespondent',
        'User.ID',
        'User.Name',
        'User.Role',
        'Creator.ID',
        'Creator.Name',
        'Creator.Role',
      ]);
  }

  getMeetingWithRespondentsByID(meetingID: number): Promise<Meeting | null> {
    return this._getMeetingWithRespondents()
      .where('Meeting.ID = :meetingID', { meetingID })
      .getOne();
  }

  getMeetingWithRespondentsBySlug(
    meetingSlug: string,
  ): Promise<Meeting | null> {
    return this._getMeetingWithRespondents()
      .where('Meeting.Slug = :meetingSlug', { meetingSlug })
      .getOne();
  }

  private getRespondentsWithNotificationsEnabled(
    meetingID: number,
  ): Promise<MeetingRespondent[]> {
    return this.respondentsRepository
      .createQueryBuilder()
      .leftJoin('MeetingRespondent.User', 'User')
      .select([
        // !!!!!!!!!!
        // There appears to be a bug in TypeORM where non-guest respondents
        // get dropped from the result if the MeetingID column is not selected.
        // They show up in the "raw" results, but not in the list of entities
        // returned from getMany().
        // So we need to select the MeetingID even though it's redundant.
        // !!!!!!!!!!
        'MeetingRespondent.MeetingID',
        'MeetingRespondent.GuestName',
        'MeetingRespondent.GuestEmail',
        'User.ID',
        'User.Name',
        'User.Email',
      ])
      .where('MeetingRespondent.MeetingID = :meetingID', { meetingID })
      .andWhere(
        '(MeetingRespondent.GuestEmail IS NOT NULL OR User.IsSubscribedToNotifications)',
      )
      .getMany();
  }

  private async updateMeetingDB(
    meeting: Meeting,
    meetingInfo: Partial<Meeting>,
  ) {
    // TODO: use a transaction to wrap the initial read of the meeting + the update
    await this.meetingsRepository.update(meeting.ID, meetingInfo);
    Object.assign(meeting, meetingInfo);
  }

  async editMeeting(meeting: Meeting, partialUpdate: Partial<Meeting>) {
    const { Name: oldName, About: oldAbout } = meeting;
    await this.updateMeetingDB(meeting, partialUpdate);
    if (
      meeting.ScheduledStartDateTime !== null &&
      meeting.ScheduledEndDateTime !== null &&
      (meeting.Name !== oldName || meeting.About !== oldAbout)
    ) {
      // Update respondents' external calendars
      // Do not await the Promise so that we don't block the caller
      this.oauth2Service.tryCreateOrUpdateEventsForMeetingForAllRespondents(
        meeting,
      );
    }
  }

  private createScheduledNotificationEmailBody(
    meeting: Meeting,
    name: string,
  ): string {
    const { dayString, timeRangeString } = formatScheduledTimeRange(
      meeting.ScheduledStartDateTime,
      meeting.ScheduledEndDateTime,
      meeting.Timezone,
    );
    return (
      `Hello ${name},\n` +
      '\n' +
      `The meeting "${meeting.Name}" has been scheduled.\n` +
      '\n' +
      `  ${dayString}\n` +
      `  ${timeRangeString}\n` +
      '\n' +
      `View details here: ${createPublicMeetingURL(this.publicURL, meeting)}\n` +
      '\n' +
      `Best,\n` +
      `Vader Whiteout Team\n`
    );
  }

  private createScheduledNotificationEmailHtml(
    meeting: Meeting,
    name: string,
  ): string {
    const { dayString, timeRangeString } = formatScheduledTimeRange(
      meeting.ScheduledStartDateTime,
      meeting.ScheduledEndDateTime,
      meeting.Timezone,
    );
    return emailShell({
      preheader: `${meeting.Name} now has a confirmed time.`,
      firstName: name,
      ctaUrl: createPublicMeetingURL(this.publicURL, meeting),
      ctaText: 'View meeting',
      bodyHtml: `
        <p style="margin:0 0 16px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
          <em>${escapeHtml(meeting.Name)}</em> has been scheduled.
        </p>
        <p style="margin:0 0 16px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
          ${escapeHtml(dayString)}<br />
          ${escapeHtml(timeRangeString)}
        </p>
        <p style="margin:0 0 12px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
          You can view the full meeting details below.
        </p>
      `,
    });
  }

  async scheduleMeeting(
    maybeUser: User | null,
    meeting: Meeting,
    startDateTime: string,
    endDateTime: string,
  ) {
    // Update database
    const { WasScheduledAtLeastOnce: wasScheduledAtLeastOnce } = meeting;
    const updatedInfo: Partial<Meeting> = {
      ScheduledStartDateTime: startDateTime,
      ScheduledEndDateTime: endDateTime,
      WasScheduledAtLeastOnce: true,
    };
    await this.updateMeetingDB(meeting, updatedInfo);
    // Send email notifications
    if (!wasScheduledAtLeastOnce) {
      const respondentsToBeNotified =
        await this.getRespondentsWithNotificationsEnabled(meeting.ID);
      for (const respondent of respondentsToBeNotified) {
        if (maybeUser && respondent.User?.ID === maybeUser.ID) {
          // Don't notify the person who scheduled the meeting
          continue;
        }
        const address = respondent.GuestEmail || respondent.User.Email;
        const name = respondent.GuestName || respondent.User.Name;
        // Do not await the Promise so that we don't block the caller
        this.mailService.sendNowOrLater({
          recipient: { name, address },
          subject: `${meeting.Name} has been scheduled`,
          body: this.createScheduledNotificationEmailBody(meeting, name),
          html: this.createScheduledNotificationEmailHtml(meeting, name),
        });
      }
    }
    // Update respondents' external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryCreateOrUpdateEventsForMeetingForAllRespondents(
      meeting,
    );
  }

  async unscheduleMeeting(meeting: Meeting) {
    const updatedInfo: Partial<Meeting> = {
      ScheduledStartDateTime: null,
      ScheduledEndDateTime: null,
    };
    await this.updateMeetingDB(meeting, updatedInfo);
    // Update respondents' external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryDeleteEventsForMeetingForAllRespondents(meeting.ID);
  }

  async deleteMeeting(meetingSlug: string): Promise<void> {
    // This meeting needs to be deleted from all of the respondents' Google calendars.
    // We need to wait until this runs to completion or else the row in
    // the GoogleCalendarCreatedEvents table might be deleted prematurely
    // (due to cascading deletions).
    // Unfortunately this might take a long time, but since deleting a meeting is a
    // relatively infrequent operation, it should be acceptable. The use of
    // Promise.allSettled() in the OAuth2Service should hopefully speed things up.
    //
    // Alternative solution: use a tombstoned row
    const meeting = await this.getMeetingOrThrow(meetingSlug);
    await this.oauth2Service.tryDeleteEventsForMeetingForAllRespondents(
      meeting.ID,
    );
    await this.meetingsRepository.delete(meeting.ID);
  }

  async getRespondent(respondentID: number): Promise<MeetingRespondent | null> {
    return this.respondentsRepository
      .createQueryBuilder()
      .innerJoin('MeetingRespondent.Meeting', 'Meeting')
      .select(['MeetingRespondent', 'Meeting'])
      .where('MeetingRespondent.RespondentID = :respondentID', { respondentID })
      .getOne();
  }

  private async getRespondentByMeetingAndUserID(
    meetingSlug: string,
    userID: number,
  ): Promise<MeetingRespondent | null> {
    return this.respondentsRepository
      .createQueryBuilder()
      .innerJoin(
        'MeetingRespondent.Meeting',
        'Meeting',
        'Meeting.Slug = :meetingSlug',
        { meetingSlug },
      )
      .select(['MeetingRespondent', 'Meeting'])
      .where('MeetingRespondent.UserID = :userID', { userID })
      .getOne();
  }

  private async sendRespondentAddedNotification(
    meeting: Meeting,
    { user, guestName }: { user?: User; guestName?: string },
  ) {
    if (!meeting.CreatorID) {
      return;
    }
    if (user && user.ID === meeting.CreatorID) {
      // Don't want to notify someone if they added their availabilities
      // for their own meeting
      return;
    }
    const meetingCreator = await this.usersService.findOneByID(
      meeting.CreatorID,
    );
    if (!meetingCreator.IsSubscribedToNotifications) {
      return;
    }
    const respondentName = user?.Name ?? guestName;
    await this.queueRespondentAddedDigest(meeting, respondentName);
  }



  private async queueRespondentAddedDigest(
    meeting: Meeting,
    respondentName: string,
  ) {
    let state = await this.meetingNotificationStateRepository.findOne({
      where: { MeetingID: meeting.ID },
    });

    if (!state) {
      state = this.meetingNotificationStateRepository.create({
        MeetingID: meeting.ID,
        CreatorDigestPendingSince: new Date(),
        PendingRespondentNamesJSON: JSON.stringify([respondentName]),
      });
    } else {
      const names = JSON.parse(state.PendingRespondentNamesJSON || '[]') as string[];
      if (!names.includes(respondentName)) {
        names.push(respondentName);
      }
      state.PendingRespondentNamesJSON = JSON.stringify(names);
      if (!state.CreatorDigestPendingSince) {
        state.CreatorDigestPendingSince = new Date();
      }
    }

    await this.meetingNotificationStateRepository.save(state);
  }

  async flushPendingCreatorDigests() {
    const cutoff = new Date(Date.now() - 3 * 60 * 1000);

    const states = await this.meetingNotificationStateRepository.find({
      where: { CreatorDigestPendingSince: LessThanOrEqual(cutoff) },
    });

    for (const state of states) {
      if (!state.CreatorDigestPendingSince) continue;

      const meeting = await this.meetingsRepository.findOneBy({
        ID: state.MeetingID,
      });
      if (!meeting) continue;
      if (!meeting.CreatorID) continue;

      const meetingCreator = await this.usersService.findOneByID(meeting.CreatorID);
      if (!meetingCreator.IsSubscribedToNotifications) continue;

      const respondentNames = JSON.parse(
        state.PendingRespondentNamesJSON || '[]'
      ) as string[];

      if (respondentNames.length === 0) {
        state.CreatorDigestPendingSince = null;
        await this.meetingNotificationStateRepository.save(state);
        continue;
      }

      const count = respondentNames.length;
      const plural = count === 1 ? '' : 's';
      const isAre = count === 1 ? 'is' : 'are';
      const namesText = respondentNames.join(', ');
      const meetingURL = createPublicMeetingURL(this.publicURL, meeting);

      const body = `Hello ${meetingCreator.Name},

There ${isAre} ${count} new response${plural} for "${meeting.Name}" since the last update.

New respondents: ${namesText}

Please visit ${meetingURL} for details.

Best,
Vader Whiteout Team
`;

      const html = emailShell({
        preheader: `${count} new response${plural} for ${meeting.Name}.`,
        firstName: meetingCreator.Name,
        ctaUrl: meetingURL,
        ctaText: 'View meeting',
        bodyHtml: `
          <p style="margin:0 0 16px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
            There ${isAre} ${count} new response${plural} for <em>${escapeHtml(meeting.Name)}</em> since the last update.
          </p>
          <p style="margin:0 0 16px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
            New respondents: ${escapeHtml(namesText)}
          </p>
          <p style="margin:0 0 12px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;">
            You can review the latest availability and decide on the best time below.
          </p>
        `,
      });

      await this.mailService.sendNowOrLater({
        subject: `New availability updates for "${meeting.Name}"`,
        recipient: { address: meetingCreator.Email, name: meetingCreator.Name },
        body,
        html,
      });

      state.CreatorDigestPendingSince = null;
      state.PendingRespondentNamesJSON = JSON.stringify([]);
      await this.meetingNotificationStateRepository.save(state);
    }
  }

  async addRespondent({
    meetingSlug,
    availabilities,
    ifNeededAvailabilities = [],
    user,
    guestName,
    guestEmail,
  }: {
    meetingSlug: string,
    availabilities: string[],
    ifNeededAvailabilities?: string[],
    user?: User,
    guestName?: string,
    guestEmail?: string,
  }): Promise<Meeting> {
    // TODO: use transaction
    const meeting = await this.getMeetingWithRespondentsBySlug(meetingSlug);
    if (!meeting) {
      throw new NoSuchMeetingError();
    }
    const respondent: Partial<MeetingRespondent> = {
      Meeting: meeting,
      MeetingID: meeting.ID,
      Availabilities: availabilities,
      IfNeededAvailabilities: ifNeededAvailabilities ?? [],
    };
    if (user) {
      respondent.User = user;
      respondent.UserID = user.ID;
    } else {
      assert(guestName, 'guestName should have been set');
      respondent.GuestName = guestName;
      respondent.GuestEmail = guestEmail || null;
    }
    await this.respondentsRepository.insert(respondent);
    assert(respondent.RespondentID, 'RespondentID should have been updated');
    meeting.Respondents.push(respondent as MeetingRespondent);
    // Do not await the promise to avoid blocking the client
    await this.sendRespondentAddedNotification(meeting, { user, guestName });
    await this.flushPendingCreatorDigests();
    return meeting;
  }


  async updateRespondent(
    respondentID: number,
    meetingSlug: string,
    availabilities: string[],
    ifNeededAvailabilities: string[] = [],
  ): Promise<Meeting> {
    // TODO: wrap in transaction
    const meeting = await this.getMeetingWithRespondentsBySlug(meetingSlug);
    if (!meeting) {
      throw new NoSuchMeetingError();
    }
    const result = await this.respondentsRepository.update(
      {
        RespondentID: respondentID,
        MeetingID: meeting.ID,
      },
      {
        Availabilities: availabilities,
        IfNeededAvailabilities: ifNeededAvailabilities ?? [],
      },
    );
    if (result.affected === 0) {
      throw new NoSuchRespondentError();
    }
    for (const respondent of meeting.Respondents) {
      if (respondent.RespondentID === respondentID) {
        respondent.Availabilities = availabilities;
        respondent.IfNeededAvailabilities = ifNeededAvailabilities;
        break;
      }
    }
    return meeting;
  }


  async addOrUpdateRespondent(
    meetingSlug: string,
    user: User,
    availabilities: string[],
    ifNeededAvailabilities: string[] = [],
  ): Promise<Meeting> {
    const existingRespondent = await this.getRespondentByMeetingAndUserID(
      meetingSlug,
      user.ID,
    );
    let updatedMeeting: Meeting | undefined;
    if (existingRespondent) {
      updatedMeeting = await this.updateRespondent(
        existingRespondent.RespondentID,
        meetingSlug,
        availabilities,
        ifNeededAvailabilities,
      );
    } else {
      updatedMeeting = await this.addRespondent({
        meetingSlug,
        availabilities,
        ifNeededAvailabilities,
        user,
      });
    }
    // Update respondent's external calendars
    // Do not await the Promise so that we don't block the caller
    this.oauth2Service.tryCreateOrUpdateEventsForMeetingForSingleRespondent(
      user.ID,
      updatedMeeting,
    );
    return updatedMeeting;
  }

  async deleteRespondent(respondent: MeetingRespondent): Promise<Meeting> {
    if (respondent.UserID !== null) {
      // We need to wait until this runs to completion or else the row in
      // the GoogleCalendarCreatedEvents table might be deleted prematurely
      // (due to cascading deletions).
      await this.oauth2Service.tryDeleteEventsForMeetingForSingleRespondent(
        respondent.UserID,
        respondent.MeetingID,
      );
    }
    await this.respondentsRepository.delete(respondent.RespondentID);
    // TODO: wrap in transaction
    return this.getMeetingWithRespondentsByID(respondent.MeetingID);
  }

  async getMeetingsCreatedBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return this.meetingsRepository
      .createQueryBuilder()
      .select(['Meeting'])
      .where('CreatorID = :userID', { userID })
      .orderBy('ID', 'DESC')
      .limit(100)
      .getMany();
  }

  async getMeetingsRespondedToBy(userID: number): Promise<Meeting[]> {
    // TODO: support cursor-based pagination
    return this.meetingsRepository
      .createQueryBuilder()
      .innerJoin('Meeting.Respondents', 'MeetingRespondent')
      .select(['Meeting'])
      .where('MeetingRespondent.UserID = :userID', { userID })
      .orderBy('ID', 'DESC')
      .limit(100)
      .getMany();
  }
}
