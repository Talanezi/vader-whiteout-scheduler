import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GenericSpinner from 'components/GenericSpinner';
import NonFocusButton from 'components/NonFocusButton';
import WeeklyViewTimePicker from './WeeklyTimeViewPicker';
import './Meeting.css';
import EditMeeting from './EditMeeting';
import { useGetMeetingQuery } from 'slices/enhancedApi';
import { useCreateMeetingMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { useSelfInfoIsPresent } from 'utils/auth.hooks';
import { useAppDispatch } from 'app/hooks';
import { setCurrentMeetingID } from 'slices/currentMeeting';
import InfoModal from 'components/InfoModal';
import { useToast } from 'components/Toast';
import { resetSelection } from 'slices/availabilitiesSelection';
import useSetTitle from 'utils/title.hook';
import { ianaTzName } from 'utils/dates.utils';

export default function Meeting() {
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const params = useParams();
  const meetingID = params.id;
  const skip = !meetingID;
  const { data, error } = useGetMeetingQuery(meetingID ?? '', { skip });

  useEffect(() => {
    dispatch(setCurrentMeetingID(meetingID));
  }, [dispatch, meetingID]);

  useSetTitle(data?.name);

  useEffect(() => {
    return () => {
      dispatch(resetSelection());
    };
  }, [dispatch]);

  const { isReady } = useGetCurrentMeetingWithSelector(({ data: meeting }) => ({
    isReady: meeting && meeting.meetingID === meetingID,
  }));

  if (skip) {
    return <p>Meeting ID is invalid.</p>;
  }
  if (error) {
    return (
      <div className="d-flex justify-content-center">
        <p>
          An error occurred while fetching the meeting:
          <br />
          {getReqErrorMessage(error)}
        </p>
      </div>
    );
  }
  if (!isReady) {
    return <GenericSpinner />;
  }
  if (isEditingMeeting) {
    return <EditMeeting setIsEditing={setIsEditingMeeting} />;
  }
  return (
    <div className="flex-grow-1">
      <MeetingTitleRow setIsEditingMeeting={setIsEditingMeeting} navigate={navigate} />
      <MeetingAboutRow />
      <hr className="my-4 my-md-5" />
      <WeeklyViewTimePicker />
    </div>
  );
}

const MeetingTitleRow = React.memo(function MeetingTitleRow({
  setIsEditingMeeting,
  navigate,
}: {
  setIsEditingMeeting: (val: boolean) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {
    name,
    meetingID,
    about,
    minStartHour,
    maxEndHour,
    tentativeDates,
    dateMode,
  } = useGetCurrentMeetingWithSelector(({ data: meeting }) => ({
    name: meeting?.name,
    meetingID: meeting?.meetingID,
    about: meeting?.about,
    minStartHour: meeting?.minStartHour,
    maxEndHour: meeting?.maxEndHour,
    tentativeDates: meeting?.tentativeDates,
    dateMode: meeting?.dateMode,
  }));
  const isLoggedIn = useSelfInfoIsPresent();
  const [showMustBeLoggedInModal, setShowMustBeLoggedInModal] = useState(false);
  const [showClipboardFailedModal, setShowClipboardFailedModal] = useState(false);
  const { showToast } = useToast();
  const [duplicateMeeting, { isLoading: isDuplicating }] = useCreateMeetingMutation();

  const shareUrl = useMemo(() => {
    if (!meetingID) return window.location.href;
    return `${window.location.origin}/scheduler/#/m/${meetingID}`;
  }, [meetingID]);

  const onClickEditButton = () => {
    if (isLoggedIn) {
      setIsEditingMeeting(true);
    } else {
      setShowMustBeLoggedInModal(true);
    }
  };

  const onClickShareButton = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (err) {
      console.error('Failed to write to clipboard:', err);
      setShowClipboardFailedModal(true);
      return;
    }
    showToast({
      msg: 'Successfully copied meeting link',
      msgType: 'success',
      autoClose: true,
    });
  };

  const onClickDuplicateButton = async () => {
    if (
      !name ||
      minStartHour === undefined ||
      maxEndHour === undefined ||
      !tentativeDates ||
      !dateMode
    ) {
      return;
    }

    try {
      const resp = await duplicateMeeting({
        name: `${name} (Copy)`,
        about: about ?? '',
        timezone: ianaTzName,
        minStartHour,
        maxEndHour,
        tentativeDates,
        dateMode,
      }).unwrap();

      showToast({
        msg: 'Meeting duplicated successfully',
        msgType: 'success',
        autoClose: true,
      });

      navigate(`/m/${resp.meetingID}`);
    } catch (err) {
      console.error('Failed to duplicate meeting:', err);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center">
        <div className="me-auto" style={{ fontSize: '1.3em' }}>
          {name}
        </div>
        <NonFocusButton
          className="btn btn-outline-secondary ps-3 ps-md-4 pe-3 d-flex align-items-center"
          onClick={onClickEditButton}
        >
          <span className="me-3 d-none d-md-inline">Edit</span> <PencilIcon />
        </NonFocusButton>
        <NonFocusButton
          className="btn btn-outline-secondary ms-4 ps-3 ps-md-4 pe-3 d-flex align-items-center"
          onClick={onClickDuplicateButton}
          disabled={isDuplicating}
        >
          <span className="me-3 d-none d-md-inline">Duplicate</span> <DuplicateIcon />
        </NonFocusButton>
        <NonFocusButton
          className="btn btn-outline-primary ms-4 ps-3 ps-md-4 pe-3 d-flex align-items-center"
          onClick={onClickShareButton}
        >
          <span className="me-3 d-none d-md-inline">Share</span> <ShareIcon />
        </NonFocusButton>
      </div>
      <InfoModal show={showMustBeLoggedInModal} setShow={setShowMustBeLoggedInModal}>
        <p className="text-center my-3">You must be logged in to edit a meeting.</p>
      </InfoModal>
      <InfoModal show={showClipboardFailedModal} setShow={setShowClipboardFailedModal}>
        <p className="text-center my-3">Could not write to clipboard. Check the console for details.</p>
      </InfoModal>
    </>
  );
});

const MeetingAboutRow = React.memo(function MeetingAboutRow() {
  const { about } = useGetCurrentMeetingWithSelector(({ data: meeting }) => ({
    about: meeting?.about,
  }));

  const parsed = useMemo(() => {
    if (!about) return { location: '', details: '' };

    const blocks = about
      .split(/\n\s*\n/)
      .map(part => part.trim())
      .filter(Boolean);

    let location = '';
    const details: string[] = [];

    for (const block of blocks) {
      if (!location && block.toLowerCase().startsWith('location:')) {
        location = block.replace(/^location:\s*/i, '').trim();
      } else {
        details.push(block);
      }
    }

    return {
      location,
      details: details.join('\n\n'),
    };
  }, [about]);

  if (!about) return null;

  return (
    <div className="vw-section-card mt-4">
      {parsed.location && (
        <div className="vw-meeting-meta-row">
          <span className="vw-meeting-meta-label">Location</span>
          <span className="vw-meeting-meta-value">{parsed.location}</span>
        </div>
      )}
      {parsed.details && (
        <div className="vw-meeting-about-text">
          {parsed.details.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
});

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil" viewBox="0 0 16 16" style={{ position: 'relative', top: '0.05em' }}>
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ position: 'relative', top: '0.05em' }}>
      <path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v8A1.5 1.5 0 0 0 4 12.5h7A1.5 1.5 0 0 0 12.5 11V3A1.5 1.5 0 0 0 11 1.5H4zm0 1h7a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3A.5.5 0 0 1 4 2.5z"/>
      <path d="M5 12.5v1A1.5 1.5 0 0 0 6.5 15h6A1.5 1.5 0 0 0 14 13.5v-8A1.5 1.5 0 0 0 12.5 4h-1v1h1a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-1H5z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-share" viewBox="0 0 16 16" style={{ position: 'relative', top: '0.1em' }}>
      <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
}
