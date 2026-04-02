import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useNavigate } from 'react-router-dom';
import { resetSelectedDates, selectSelectedDates } from 'slices/selectedDates';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import './MeetingForm.css';
import MeetingNamePrompt from './MeetingNamePrompt';
import MeetingAboutPrompt from './MeetingAboutPrompt';
import MeetingTimesPrompt from './MeetingTimesPrompt';
import { useCreateMeetingMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { ianaTzName } from 'utils/dates.utils';
import useSetTitle from 'utils/title.hook';

export default function MeetingForm() {
  const [meetingName, setMeetingName] = useState('');
  const [meetingAbout, setMeetingAbout] = useState('');
  const [startTime, setStartTime] = useState(17);
  const [endTime, setEndTime] = useState(22);

  const dispatch = useAppDispatch();
  const dates = useAppSelector(selectSelectedDates);
  const [createMeeting, { data, isLoading, isSuccess, error }] =
    useCreateMeetingMutation();
  const navigate = useNavigate();

  useSetTitle('Create schedule');

  useEffect(() => {
    if (isSuccess) {
      dispatch(resetSelectedDates());
      navigate('/m/' + data!.meetingID);
    }
  }, [data, isSuccess, dispatch, navigate]);

  if (isSuccess) {
    return null;
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();

    if (meetingName === '') {
      return;
    }

    createMeeting({
      name: meetingName,
      about: meetingAbout,
      timezone: ianaTzName,
      minStartHour: startTime,
      maxEndHour: endTime,
      tentativeDates: Object.keys(dates),
    });
  };

  return (
    <Form className="create-meeting-page vw-form-shell" onSubmit={onSubmit}>
      <div className="vw-form-header">
        <div className="vw-kicker">Production block</div>
        <h2 className="vw-form-title">Build the scheduling block</h2>
        <p className="vw-form-note">
          Keep it specific so crew immediately know what this schedule is for.
        </p>
      </div>

      <MeetingNamePrompt
        meetingName={meetingName}
        setMeetingName={setMeetingName}
        isLoading={isLoading}
      />

      {error && (
        <p className="text-danger text-center mt-3">
          An error occurred: {getReqErrorMessage(error)}
        </p>
      )}

      <MeetingAboutPrompt
        meetingAbout={meetingAbout}
        setMeetingAbout={setMeetingAbout}
      />

      <MeetingTimesPrompt
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
      />
    </Form>
  );
}
