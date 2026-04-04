import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomOverlay from 'components/BottomOverlay';
import {
  selectSelMode,
  resetSelection,
  useEditSelf,
  useEditSelectedUser,
  createSchedule,
  selectSelectedTimes,
  addDateTimesAndResetMouse,
  removeDateTimesAndResetMouse,
} from 'slices/availabilitiesSelection';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import SubmitAsGuestModal from './SubmitAsGuestModal';
import { useToast } from 'components/Toast';
import { assert, assertIsNever, scrollUpIntoViewIfNeeded } from 'utils/misc.utils';
import {
  addMinutesToDateTimeString,
  customToISOString,
  daysOfWeek,
  getDateFromString,
  months,
  to12HourClock,
} from 'utils/dates.utils';
import ButtonWithSpinner from 'components/ButtonWithSpinner';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { selectTokenIsPresent } from 'slices/authentication';
import { usePutSelfRespondentMutation, useScheduleMeetingMutation, useUnscheduleMeetingMutation, useUpdateAvailabilitiesMutation } from 'slices/api';
import { getReqErrorMessage } from 'utils/requests.utils';
import { selectCurrentMeetingID } from 'slices/currentMeeting';
import InfoModal from 'components/InfoModal';
import NonFocusButton from 'components/NonFocusButton';
import DeleteRespondentModal from './DeleteRespondentModal';

const TEMPLATE_KEY = 'vw_availability_template_v1';

type TemplateSlot = {
  weekday: number;
  hour: number;
  minute: number;
};

function saveTemplateFromDateTimes(dateTimes: string[]) {
  const slots: TemplateSlot[] = dateTimes
    .map(dateTime => {
      const d = new Date(dateTime);
      return {
        weekday: d.getDay(),
        hour: d.getHours(),
        minute: d.getMinutes(),
      };
    })
    .filter((slot, idx, arr) =>
      arr.findIndex(other =>
        other.weekday === slot.weekday &&
        other.hour === slot.hour &&
        other.minute === slot.minute
      ) === idx
    );

  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(slots));
}

function loadTemplate(): TemplateSlot[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      slot =>
        typeof slot?.weekday === 'number' &&
        typeof slot?.hour === 'number' &&
        typeof slot?.minute === 'number'
    );
  } catch {
    return [];
  }
}

function buildDateTimesFromTemplate(slots: TemplateSlot[], allDateStrings: string[]) {
  const result: string[] = [];

  for (const dateString of allDateStrings) {
    const weekday = getDateFromString(dateString).getDay();
    for (const slot of slots) {
      if (slot.weekday === weekday) {
        result.push(customToISOString(dateString, slot.hour, slot.minute));
      }
    }
  }

  return result;
}

function AvailabilitiesRow({
  moreDaysToRight,
  pageDispatch,
  allDateStrings,
}: {
  moreDaysToRight: boolean;
  pageDispatch: React.Dispatch<'inc' | 'dec'>;
  allDateStrings: string[];
}) {
  const selMode = useAppSelector(selectSelMode);
  const selectedTimes = useAppSelector(selectSelectedTimes);
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const { respondents, selfRespondentID, scheduledStartDateTime, scheduledEndDateTime } = useGetCurrentMeetingWithSelector(
    ({ data: meeting }) => ({
      respondents: meeting?.respondents,
      selfRespondentID: meeting?.selfRespondentID,
      scheduledStartDateTime: meeting?.scheduledStartDateTime,
      scheduledEndDateTime: meeting?.scheduledEndDateTime,
    })
  );
  assert(meetingID !== undefined && respondents !== undefined);

  const selfRespondentIDRef = useRef(selfRespondentID);
  const isScheduled = scheduledStartDateTime !== undefined && scheduledEndDateTime !== undefined;

  const scheduledDateTimeTitle = useMemo(() => {
    if (scheduledStartDateTime === undefined || scheduledEndDateTime === undefined) {
      return null;
    }
    return createTitleWithSchedule(scheduledStartDateTime, scheduledEndDateTime);
  }, [scheduledStartDateTime, scheduledEndDateTime]);

  const isLoggedIn = useAppSelector(selectTokenIsPresent);
  const editSelf = useEditSelf(isLoggedIn);
  const editSelectedUser = useEditSelectedUser();

  const [
    submitSelf,
    { isSuccess: submitSelf_isSuccess, isLoading: submitSelf_isLoading, error: submitSelf_error, reset: submitSelf_reset }
  ] = usePutSelfRespondentMutation();

  const [
    updateRespondent,
    { isSuccess: updateRespondent_isSuccess, isLoading: updateRespondent_isLoading, error: updateRespondent_error, reset: updateRespondent_reset }
  ] = useUpdateAvailabilitiesMutation();

  const [
    schedule,
    { isSuccess: schedule_isSuccess, isLoading: schedule_isLoading, error: schedule_error, reset: schedule_reset }
  ] = useScheduleMeetingMutation();

  const [
    unschedule,
    { isSuccess: unschedule_isSuccess, isLoading: unschedule_isLoading, error: unschedule_error, reset: unschedule_reset }
  ] = useUnscheduleMeetingMutation();

  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteRespondentModal, setShowDeleteRespondentModal] = useState(false);
  const errorMessageElemRef = useRef<HTMLParagraphElement>(null);
  let title = 'Availabilities';
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const selectedUserNameRef = useRef<string | null>(null);

  if (scheduledDateTimeTitle !== null) {
    title = scheduledDateTimeTitle;
  }

  useEffect(() => {
    if (submitSelf_isSuccess) {
      const verb = selfRespondentIDRef.current === undefined ? 'added' : 'updated';
      showToast({
        msg: `Successfully ${verb} availabilities`,
        msgType: 'success',
        autoClose: true,
      });
      dispatch(resetSelection());
    }
  }, [submitSelf_isSuccess, showToast, dispatch]);

  useEffect(() => {
    selfRespondentIDRef.current = selfRespondentID;
  }, [selfRespondentID]);

  useEffect(() => {
    if (updateRespondent_isSuccess) {
      dispatch(resetSelection());
    }
  }, [updateRespondent_isSuccess, dispatch]);

  useEffect(() => {
    if (schedule_isSuccess) {
      dispatch(resetSelection());
    }
  }, [schedule_isSuccess, dispatch]);

  useEffect(() => {
    if (unschedule_isSuccess) {
      dispatch(resetSelection());
    }
  }, [unschedule_isSuccess, dispatch]);

  useEffect(() => {
    if (selMode.type === 'selectedUser') {
      selectedUserNameRef.current = respondents[selMode.selectedRespondentID].name;
    } else if (selMode.type === 'editingRespondent') {
      selectedUserNameRef.current = respondents[selMode.respondentID].name;
    } else {
      selectedUserNameRef.current = null;
    }
    setSelectedUserName(selectedUserNameRef.current);
  }, [selMode, respondents]);

  const clearErrors = () => {
    if (submitSelf_error) submitSelf_reset();
    if (updateRespondent_error) updateRespondent_reset();
    if (schedule_error) schedule_reset();
    if (unschedule_error) unschedule_reset();
  };

  const error = submitSelf_error || updateRespondent_error || schedule_error || unschedule_error;

  useEffect(() => {
    if (error) {
      scrollUpIntoViewIfNeeded(errorMessageElemRef.current!, 48);
    }
  }, [error]);

  const btnDisabled =
    submitSelf_isLoading || updateRespondent_isLoading || schedule_isLoading || unschedule_isLoading;

  const canUseTemplate =
    selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent';

  const onSaveTemplate = () => {
    const current = Object.keys(selectedTimes);
    if (current.length === 0) {
      showToast({
        msg: 'Select at least one availability block first',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }
    saveTemplateFromDateTimes(current);
    showToast({
      msg: 'Saved weekday availability template',
      msgType: 'success',
      autoClose: true,
    });
  };

  const onApplyTemplate = () => {
    const template = loadTemplate();
    if (template.length === 0) {
      showToast({
        msg: 'No saved availability template yet',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    const current = Object.keys(selectedTimes);
    const next = buildDateTimesFromTemplate(template, allDateStrings);

    if (current.length > 0) {
      dispatch(removeDateTimesAndResetMouse(current));
    }
    if (next.length > 0) {
      dispatch(addDateTimesAndResetMouse(next));
    }

    showToast({
      msg: 'Applied saved weekday template',
      msgType: 'success',
      autoClose: true,
    });
  };

  let rightBtnText: string | undefined;
  let onRightBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let rightBtn_isLoading = false;

  if (selMode.type === 'none') {
    rightBtnText = selfRespondentID !== undefined ? 'Edit availability' : 'Add availability';
    onRightBtnClick = () => editSelf();
  } else if (selMode.type === 'addingRespondent') {
    title = 'Add your availability';
    rightBtnText = 'Continue';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else if (isLoggedIn) {
      onRightBtnClick = () => {
        if (Object.keys(selectedTimes).length === 0) {
          setShowInfoModal(true);
          return;
        }
        submitSelf({
          id: meetingID,
          putRespondentDto: {
            availabilities: Object.keys(selectedTimes),
          },
        });
      };
      rightBtn_isLoading = submitSelf_isLoading;
    } else {
      onRightBtnClick = () => setShowGuestModal(true);
    }
  } else if (selMode.type === 'editingRespondent') {
    title =
      selfRespondentID === selMode.respondentID
        ? 'Edit your availability'
        : `Edit ${selectedUserName}'s availability`;

    rightBtnText = 'Next';
    if (moreDaysToRight) {
      onRightBtnClick = () => pageDispatch('inc');
    } else {
      onRightBtnClick = () => {
        if (Object.keys(selectedTimes).length === 0) {
          setShowInfoModal(true);
          return;
        }
        updateRespondent({
          id: meetingID,
          respondentId: selMode.respondentID,
          putRespondentDto: {
            availabilities: Object.keys(selectedTimes),
          },
        });
      };
      rightBtn_isLoading = updateRespondent_isLoading;
    }
  } else if (selMode.type === 'editingSchedule') {
    title = 'Schedule your meeting';
    rightBtnText = 'Save';
    onRightBtnClick = () => {
      const selectedTimesFlat = Object.keys(selectedTimes).sort();
      if (selectedTimesFlat.length === 0) {
        setShowInfoModal(true);
        return;
      }
      schedule({
        id: meetingID,
        scheduleMeetingDto: {
          startDateTime: selectedTimesFlat[0],
          endDateTime: addMinutesToDateTimeString(
            selectedTimesFlat[selectedTimesFlat.length - 1],
            30
          ),
        },
      });
    };
    rightBtn_isLoading = schedule_isLoading;
  } else if (selMode.type === 'selectedUser') {
    title =
      selfRespondentID === selMode.selectedRespondentID
        ? 'Your availability'
        : `${selectedUserName}'s availability`;

    rightBtnText =
      selfRespondentID === selMode.selectedRespondentID
        ? 'Edit availability'
        : `Edit ${selectedUserName}'s availability`;

    onRightBtnClick = () => editSelectedUser();
  } else {
    assertIsNever(selMode);
  }

  let leftBtnText: string | undefined;
  let onLeftBtnClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  let leftBtn_isLoading = false;

  if (selMode.type === 'none') {
    if (isScheduled) {
      leftBtnText = 'Unschedule';
      onLeftBtnClick = () => unschedule(meetingID);
      leftBtn_isLoading = unschedule_isLoading;
    } else {
      leftBtnText = 'Schedule';
      onLeftBtnClick = () => dispatch(createSchedule());
    }
  } else {
    leftBtnText = 'Cancel';
    onLeftBtnClick = () => {
      dispatch(resetSelection());
      clearErrors();
    };
  }

  const onDeleteBtnClick =
    selMode.type === 'editingRespondent'
      ? () => setShowDeleteRespondentModal(true)
      : undefined;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div style={{ fontSize: '1.3em' }}>{title}</div>

        <div className="d-flex align-items-center flex-wrap gap-3">
          {canUseTemplate && (
            <>
              <NonFocusButton
                className="btn btn-outline-secondary meeting-avl-button"
                onClick={onSaveTemplate}
                disabled={btnDisabled}
              >
                Save template
              </NonFocusButton>
              <NonFocusButton
                className="btn btn-outline-secondary meeting-avl-button"
                onClick={onApplyTemplate}
                disabled={btnDisabled}
              >
                Apply template
              </NonFocusButton>
            </>
          )}

          <div className="d-none d-md-flex">
            {onDeleteBtnClick && (
              <NonFocusButton
                className="btn btn-outline-danger me-4 meeting-avl-button"
                onClick={onDeleteBtnClick}
                disabled={btnDisabled}
              >
                Delete
              </NonFocusButton>
            )}

            {onLeftBtnClick && (
              <ButtonWithSpinner
                as="NonFocusButton"
                className="btn btn-outline-primary meeting-avl-button"
                onClick={onLeftBtnClick}
                disabled={btnDisabled}
                isLoading={leftBtn_isLoading}
              >
                {leftBtnText}
              </ButtonWithSpinner>
            )}

            <ButtonWithSpinner
              as="NonFocusButton"
              className="btn btn-primary ms-4 meeting-avl-button"
              onClick={onRightBtnClick}
              disabled={btnDisabled}
              isLoading={rightBtn_isLoading}
            >
              {rightBtnText}
            </ButtonWithSpinner>
          </div>
        </div>
      </div>

      <BottomOverlay>
        {onDeleteBtnClick && (
          <NonFocusButton
            className="btn btn-outline-light me-2 meeting-avl-button"
            onClick={onDeleteBtnClick}
            disabled={btnDisabled}
          >
            Delete
          </NonFocusButton>
        )}
        {leftBtnText && (
          <ButtonWithSpinner
            as="NonFocusButton"
            className="btn btn-outline-light meeting-avl-button"
            onClick={onLeftBtnClick}
            disabled={btnDisabled}
            isLoading={leftBtn_isLoading}
          >
            {leftBtnText}
          </ButtonWithSpinner>
        )}
        <ButtonWithSpinner
          as="NonFocusButton"
          className="btn btn-light ms-auto meeting-avl-button"
          onClick={onRightBtnClick}
          disabled={btnDisabled}
          isLoading={rightBtn_isLoading}
        >
          {rightBtnText}
        </ButtonWithSpinner>
      </BottomOverlay>

      {error && (
        <p
          className="text-danger text-center mb-0 mt-3"
          ref={errorMessageElemRef}
        >
          An error occurred: {getReqErrorMessage(error)}
        </p>
      )}

      <SubmitAsGuestModal show={showGuestModal} setShow={setShowGuestModal} />
      <InfoModal show={showInfoModal} setShow={setShowInfoModal}>
        <p className="text-center my-3">At least one time needs to be selected.</p>
      </InfoModal>
      <DeleteRespondentModal
        show={showDeleteRespondentModal}
        setShow={setShowDeleteRespondentModal}
        respondentID={selMode.type === 'editingRespondent' ? selMode.respondentID : 0}
      />
    </>
  );
}

export default React.memo(AvailabilitiesRow);

function createTitleWithSchedule(startDateTime: string, endDateTime: string): string {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  const dayOfWeek = daysOfWeek[startDate.getDay()].substring(0, 3);
  const month = months[startDate.getMonth()].substring(0, 3);
  const day = startDate.getDate();
  const startTime =
    to12HourClock(startDate.getHours()) +
    ':' +
    String(startDate.getMinutes()).padStart(2, '0') +
    (startDate.getHours() < 12 ? 'AM' : 'PM');
  const endTime =
    to12HourClock(endDate.getHours()) +
    ':' +
    String(endDate.getMinutes()).padStart(2, '0') +
    (endDate.getHours() < 12 ? 'AM' : 'PM');

  return `${dayOfWeek}, ${month} ${day} from ${startTime} - ${endTime}`;
}
