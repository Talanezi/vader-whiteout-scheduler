import type { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import type { SerializedError } from "@reduxjs/toolkit";
import React, { useEffect, useRef, useState } from "react";
import Form from "react-bootstrap/Form";
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from "components/BottomOverlay";
import MeetingAboutPrompt from "components/MeetingForm/MeetingAboutPrompt";
import MeetingTimesPrompt from "components/MeetingForm/MeetingTimesPrompt";
import Calendar from "components/DayPicker/Calendar";
import 'components/DayPicker/DayPicker.css';
import 'components/MeetingForm/MeetingForm.css';
import { resetSelectedDates, selectSelectedDates, setSelectedDates } from "slices/selectedDates";
import { resetDateSelectionMode, selectDateSelectionMode, setDateSelectionMode } from "slices/dateSelectionMode";
import {
  addWeekday,
  removeWeekday,
  resetSelectedWeekdays,
  selectSelectedWeekdays,
  setSelectedWeekdays,
} from "slices/selectedWeekdays";
import { arrayToObject } from "utils/arrays.utils";
import { useToast } from "components/Toast";
import DeleteMeetingModal from "./DeleteMeetingModal";
import ButtonWithSpinner from "components/ButtonWithSpinner";
import { EditMeetingDto, useEditMeetingMutation } from "slices/api";
import { getReqErrorMessage, useMutationWithPersistentError } from "utils/requests.utils";
import { ianaTzName } from "utils/dates.utils";
import {
  areAllDatesCanonicalDow,
  canonicalDowLabels,
  canonicalDowDates,
  selectedWeekdaysToCanonicalDates,
} from "utils/dowDates";
import { useGetCurrentMeetingWithSelector } from "utils/meetings.hooks";
import { assert, scrollUpIntoViewIfNeeded } from "utils/misc.utils";

// TODO: reduce code duplication with MeetingForm

export default function EditMeeting({
  setIsEditing,
}: {
  setIsEditing: (val: boolean) => void,
}) {
  const {meeting} = useGetCurrentMeetingWithSelector(
    ({data: meeting}) => ({meeting})
  );
  assert(meeting !== undefined);
  const [meetingName, setMeetingName] = useState(meeting.name);
  const [meetingAbout, setMeetingAbout] = useState(meeting.about);
  const [startTime, setStartTime] = useState(Math.floor(meeting.minStartHour));
  const [endTime, setEndTime] = useState(Math.ceil(meeting.maxEndHour));
  const selectedDates = useAppSelector(selectSelectedDates);
  const dateSelectionMode = useAppSelector(selectDateSelectionMode);
  const selectedWeekdays = useAppSelector(selectSelectedWeekdays);
  const [editMeeting, {isLoading, isSuccess, error}] = useMutationWithPersistentError(useEditMeetingMutation);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      dispatch(resetSelectedDates());
      dispatch(resetSelectedWeekdays());
      dispatch(resetDateSelectionMode());
    };
  }, [dispatch]);

  // FIXME: This seems to run twice during the first render
  useEffect(() => {
    const isDowMeeting =
      meeting.dateMode === 'dow' || areAllDatesCanonicalDow(meeting.tentativeDates);

    if (isDowMeeting) {
      dispatch(setDateSelectionMode('dow'));
      dispatch(resetSelectedDates());
      dispatch(setSelectedWeekdays(
        Object.fromEntries(
          meeting.tentativeDates
            .map((d) => canonicalDowDates.indexOf(d))
            .filter((idx) => idx >= 0)
            .map((idx) => [idx, true])
        )
      ));
    } else {
      dispatch(setDateSelectionMode('specific'));
      dispatch(resetSelectedWeekdays());
      dispatch(setSelectedDates(arrayToObject(meeting.tentativeDates)));
    }
  }, [dispatch, meeting.tentativeDates, meeting.dateMode]);

  useEffect(() => {
    if (isSuccess) {
      showToast({
        msg: 'Meeting successfully edited',
        msgType: 'success',
        autoClose: true,
      });
      setIsEditing(false);
    }
  }, [isSuccess, showToast, setIsEditing]);

  const onSave: React.MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.preventDefault();
    if (meetingName === '') {
      // TODO: use Form validation
      return;
    }
    const body: EditMeetingDto = {};
    if (meetingName !== meeting.name) {
      body.name = meetingName;
    }
    if (meetingAbout !== meeting.about) {
      body.about = meetingAbout;
    }
    const nextTentativeDates =
      dateSelectionMode === 'specific'
        ? Object.keys(selectedDates).sort()
        : selectedWeekdaysToCanonicalDates(selectedWeekdays);

    const datesChanged =
      nextTentativeDates.length !== meeting.tentativeDates.length
      || nextTentativeDates.some((s, i) => s !== meeting.tentativeDates[i]);

    const timesChanged =
      startTime !== meeting.minStartHour
      || endTime !== meeting.maxEndHour;

    const dateModeChanged =
      dateSelectionMode !== (meeting.dateMode ?? 'specific');

    if (datesChanged || timesChanged || dateModeChanged) {
      body.tentativeDates = nextTentativeDates;
      body.dateMode = dateSelectionMode;
      body.minStartHour = startTime;
      body.maxEndHour = endTime;
      body.timezone = ianaTzName;
    }
    if (Object.keys(body).length === 0) {
      // no change
      setIsEditing(false);
      return;
    }
    editMeeting({
      id: meeting.meetingID,
      editMeetingDto: body,
    });
  };

  return (
    <Form className="edit-meeting">
      <MeetingNamePrompt {...{meetingName, setMeetingName, setIsEditing, onSave, isLoading, error}} />
      <MeetingAboutPrompt {...{meetingAbout, setMeetingAbout}} />
      <div className="create-meeting-form-group">
        <p className="fs-5">On which days would you like to meet?</p>

        <div className="vw-calendar-topline">
          <div className="vw-mode-toggle" role="tablist" aria-label="Date selection mode">
            <button
              type="button"
              className={`vw-mode-toggle__button ${dateSelectionMode === 'specific' ? 'active' : ''}`}
              onClick={() => dispatch(setDateSelectionMode('specific'))}
            >
              Specific dates
            </button>
            <button
              type="button"
              className={`vw-mode-toggle__button ${dateSelectionMode === 'dow' ? 'active' : ''}`}
              onClick={() => dispatch(setDateSelectionMode('dow'))}
            >
              Days of week
            </button>
          </div>
        </div>

        {dateSelectionMode === 'specific' ? (
          <Calendar firstVisibleDate={meeting.tentativeDates[0]} />
        ) : (
          <div className="vw-dow-picker">
            {canonicalDowLabels.map((label, index) => {
              const selected = !!selectedWeekdays[index];
              return (
                <button
                  key={label}
                  type="button"
                  className={`vw-dow-pill ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    if (selected) {
                      dispatch(removeWeekday(index));
                    } else {
                      dispatch(addWeekday(index));
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="d-md-flex align-items-md-end">
        <MeetingTimesPrompt {...{startTime, setStartTime, endTime, setEndTime}} />
        <div className="ms-auto me-3 d-none d-md-block">
          <ButtonWithSpinner
            className="btn btn-primary"
            onClick={onSave}
            disabled={meetingName === '' || isLoading}
            isLoading={isLoading}
          >
            Save
          </ButtonWithSpinner>
        </div>
      </div>
    </Form>
  );
};

function MeetingNamePrompt({
  meetingName,
  setMeetingName,
  setIsEditing,
  onSave,
  isLoading,
  error,
}: {
  meetingName: string,
  setMeetingName: (name: string) => void,
  setIsEditing: (val: boolean) => void,
  onSave: React.MouseEventHandler<HTMLButtonElement>,
  isLoading: boolean,
  error: FetchBaseQueryError | SerializedError | undefined,
}) {
  const onMeetingNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeetingName(e.target.value);
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const errorMessageElemRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      // We need to wait until the <p> element actually becomes visible
      // before scrolling to it
      setTimeout(() => {
        scrollUpIntoViewIfNeeded(errorMessageElemRef.current!, 48);
      }, 1);
    }
  }, [error]);

  const onDeleteClick = () => setShowDeleteModal(true);
  const onCancelClick = () => setIsEditing(false);
  return (
    <>
      <DeleteMeetingModal show={showDeleteModal} setShow={setShowDeleteModal} />
      <Form.Group className="d-flex align-items-center">
        <Form.Control
          placeholder="Name your meeting"
          className="create-meeting-question form-text-input flex-grow-1"
          autoFocus
          value={meetingName}
          onChange={onMeetingNameChange}
        />
        <button
          className="btn btn-outline-danger px-4 ms-4"
          tabIndex={-1}
          type="button"
          onClick={onDeleteClick}
          disabled={isLoading}
        >
          Delete
        </button>
        <button
          className="btn btn-outline-primary px-4 d-none d-md-block ms-md-4"
          tabIndex={-1}
          type="button"
          onClick={onCancelClick}
          disabled={isLoading}
        >
          Cancel
        </button>
        <ButtonWithSpinner
          className="btn btn-primary ms-md-4 d-none d-md-block"
          tabIndex={-1}
          type="submit"
          onClick={onSave}
          disabled={meetingName === '' || isLoading}
          isLoading={isLoading}
        >
          Save
        </ButtonWithSpinner>
        <BottomOverlay>
          <button
            className="btn btn-outline-light px-4"
            tabIndex={-1}
            type="button"
            onClick={onCancelClick}
            disabled={isLoading}
          >
            Cancel
          </button>
          <ButtonWithSpinner
            className="btn btn-light ms-auto create-meeting-button"
            tabIndex={-1}
            type="submit"
            onClick={onSave}
            disabled={meetingName === '' || isLoading}
            isLoading={isLoading}
          >
            Save
          </ButtonWithSpinner>
        </BottomOverlay>
      </Form.Group>
      {error && (
        <p
          className="text-danger text-center mb-0 mt-3"
          ref={errorMessageElemRef}
        >
          Could not edit meeting: {getReqErrorMessage(error)}
        </p>
      )}
    </>
  );
}
