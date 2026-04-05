import { Link } from 'react-router-dom';
import GenericSpinner from 'components/GenericSpinner';
import { useGetAllMeetingsQuery } from 'slices/enhancedApi';
import { getReqErrorMessage } from 'utils/requests.utils';
import {
  convertDateTimeStringToHourDecimal,
  getMonthAbbr,
  getYearMonthDayFromDateString,
  to12HourClock,
  tzAbbr,
} from 'utils/dates.utils';
import type { TransformedMeetingShortResponse } from 'utils/response-transforms';
import { canonicalDowDates, canonicalDowLabels } from 'utils/dowDates';

function shortDateString(date: string): string {
  const [, month, day] = getYearMonthDayFromDateString(date);
  return getMonthAbbr(month - 1, false) + ' ' + day;
}

function shortTimeString(hour: number): string {
  const HH = String(to12HourClock(Math.floor(hour)));
  const mm = String(60 * (hour - Math.floor(hour))).padStart(2, '0');
  const amOrPm = hour < 12 ? 'am' : 'pm';
  return `${HH}:${mm} ${amOrPm}`;
}

function recurringDowLabel(meeting: TransformedMeetingShortResponse): string {
  const labels = meeting.tentativeDates
    .map((date) => canonicalDowDates.indexOf(date))
    .filter((idx) => idx >= 0)
    .map((idx) => canonicalDowLabels[idx]);

  return labels.length > 0 ? `Recurring: ${labels.join(', ')}` : 'Days of week';
}


function meetingTimesRangeString(meeting: TransformedMeetingShortResponse): string {
  let startHour: number;
  let endHour: number;

  if (meeting.scheduledStartDateTime && meeting.scheduledEndDateTime) {
    startHour = convertDateTimeStringToHourDecimal(meeting.scheduledStartDateTime);
    endHour = convertDateTimeStringToHourDecimal(meeting.scheduledEndDateTime);
  } else {
    startHour = meeting.minStartHour;
    endHour = meeting.maxEndHour;
  }

  return `${shortTimeString(startHour)} - ${shortTimeString(endHour)}`;
}

function meetingDateLabel(meeting: TransformedMeetingShortResponse): string {
  if (meeting.scheduledStartDateTime) {
    return new Date(meeting.scheduledStartDateTime).toLocaleDateString();
  }
  if (meeting.dateMode === 'dow') {
    return recurringDowLabel(meeting);
  }
  return `${shortDateString(meeting.tentativeDates[0])} - ${shortDateString(meeting.tentativeDates[meeting.tentativeDates.length - 1])}`;
}

function MeetingCard({ meeting }: { meeting: TransformedMeetingShortResponse }) {
  return (
    <Link
      to={`/m/${meeting.meetingID}`}
      className="text-decoration-none"
      style={{ width: '100%', maxWidth: 920 }}
    >
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: '1rem 1.2rem',
          background: 'rgba(255,255,255,0.03)',
          boxShadow: 'var(--vw-shadow-soft)',
        }}
      >
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h5 style={{ marginBottom: 6 }}>{meeting.name}</h5>
            {meeting.about ? (
              <div style={{ color: 'var(--mute)', marginBottom: 8 }}>{meeting.about}</div>
            ) : null}
            <div style={{ color: 'var(--mute)' }}>{meetingDateLabel(meeting)}</div>
            {meeting.createdBy ? (
              <div style={{ color: 'var(--mute)', marginTop: 6 }}>
                Created by {meeting.createdBy}
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: 'right', color: 'var(--mute)' }}>
            <div>{meetingTimesRangeString(meeting)}</div>
            <div>{tzAbbr}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MeetingsIndex() {
  const { data, isError, error } = useGetAllMeetingsQuery();

  if (isError) {
    return <p>An error occurred: {getReqErrorMessage(error!)}</p>;
  }
  if (!data) {
    return <GenericSpinner />;
  }

  const now = Date.now();
  const current = data.meetings.filter(
    (m) => !m.scheduledStartDateTime || Date.parse(m.scheduledStartDateTime) >= now
  );
  const previous = data.meetings.filter(
    (m) => m.scheduledStartDateTime && Date.parse(m.scheduledStartDateTime) < now
  );

  return (
    <div className="d-flex flex-column align-items-center" style={{ gap: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 920 }}>
        <h3 className="vw-simple-heading mb-3">Meetings</h3>
        <p style={{ color: 'var(--mute)', marginBottom: '1.25rem' }}>
          Current and upcoming production meetings.
        </p>
      </div>

      {current.length === 0 ? (
        <p style={{ color: 'var(--mute)' }}>No current meetings yet.</p>
      ) : (
        current.map((meeting) => <MeetingCard key={meeting.meetingID} meeting={meeting} />)
      )}

      <div style={{ width: '100%', maxWidth: 920, marginTop: '1.5rem' }}>
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--ink)', fontWeight: 700 }}>
            Previous meetings
          </summary>
          <div className="d-flex flex-column mt-3" style={{ gap: '1rem' }}>
            {previous.length === 0 ? (
              <p style={{ color: 'var(--mute)' }}>No previous meetings.</p>
            ) : (
              previous.map((meeting) => <MeetingCard key={meeting.meetingID} meeting={meeting} />)
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
