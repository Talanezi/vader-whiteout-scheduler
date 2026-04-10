import type Meeting from './meeting.entity';

export class NoSuchMeetingError extends Error {
  constructor() {
    super('No such meeting');
  }
}

export class NoSuchRespondentError extends Error {
  constructor() {
    super('No such respondent');
  }
}

export function createPublicMeetingURL(baseURL: string, meeting: Meeting): string {
  const trimmed = baseURL.replace(/\/$/, '');
  return `${trimmed}/m/${meeting.Slug}`;
}
