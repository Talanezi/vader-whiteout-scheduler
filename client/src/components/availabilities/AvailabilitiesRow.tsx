import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomOverlay from 'components/BottomOverlay';
import {
  selectSelMode,
  resetSelection,
  useEditSelf,
  useEditSelectedUser,
  createSchedule,
  selectSelectedTimes,
  selectIfNeededDateTimes,
  selectSelectionKind,
  setSelectionKind,
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
import { mapDowDateTimeToCurrentWeek } from 'utils/dowDates';

const TEMPLATE_KEY = 'vw_availability_templates_v2';
const LAST_TEMPLATE_KEY = 'vw_last_availability_template_v2';

type TemplateSlot = {
  weekday: number;
  hour: number;
  minute: number;
};

type SavedTemplate = {
  id: string;
  name: string;
  slots: TemplateSlot[];
  preview: string;
  createdAt: string;
  updatedAt: string;
};

function dedupeTemplateSlots(dateTimes: string[]): TemplateSlot[] {
  return dateTimes
    .map((dateTime) => {
      const d = new Date(dateTime);
      return {
        weekday: d.getDay(),
        hour: d.getHours(),
        minute: d.getMinutes(),
      };
    })
    .filter(
      (slot, idx, arr) =>
        arr.findIndex(
          (other) =>
            other.weekday === slot.weekday &&
            other.hour === slot.hour &&
            other.minute === slot.minute
        ) === idx
    )
    .sort(
      (a, b) =>
        a.weekday - b.weekday ||
        a.hour - b.hour ||
        a.minute - b.minute
    );
}

function isTemplateSlotArray(value: unknown): value is TemplateSlot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (slot) =>
        typeof slot?.weekday === 'number' &&
        typeof slot?.hour === 'number' &&
        typeof slot?.minute === 'number'
    )
  );
}

function isSavedTemplate(value: unknown): value is SavedTemplate {
  const template = value as SavedTemplate;
  return (
    typeof template?.id === 'string' &&
    typeof template?.name === 'string' &&
    typeof template?.preview === 'string' &&
    typeof template?.createdAt === 'string' &&
    typeof template?.updatedAt === 'string' &&
    isTemplateSlotArray(template?.slots)
  );
}

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedTemplate);
  } catch {
    return [];
  }
}

function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

function loadLastTemplateID(): string {
  try {
    return localStorage.getItem(LAST_TEMPLATE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveLastTemplateID(id: string) {
  localStorage.setItem(LAST_TEMPLATE_KEY, id);
}

function clearLastTemplateID() {
  localStorage.removeItem(LAST_TEMPLATE_KEY);
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

function formatTemplateTimeRange(slots: TemplateSlot[]): string | null {
  if (slots.length === 0) return null;

  const sorted = [...slots].sort(
    (a, b) => a.hour - b.hour || a.minute - b.minute
  );

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    const prevMinutes = prev.hour * 60 + prev.minute;
    const currentMinutes = current.hour * 60 + current.minute;
    if (currentMinutes - prevMinutes !== 30) {
      return null;
    }
  }

  const start = sorted[0];
  const last = sorted[sorted.length - 1];
  const endDate = new Date(2000, 0, 1, last.hour, last.minute + 30);
  const startLabel = `${to12HourClock(start.hour)} ${
    start.hour < 12 ? 'AM' : 'PM'
  }`;
  const endLabel = `${to12HourClock(endDate.getHours())} ${
    endDate.getHours() < 12 ? 'AM' : 'PM'
  }`;

  return `${startLabel}–${endLabel}`;
}

function summarizeTemplateSlots(slots: TemplateSlot[]): string {
  if (slots.length === 0) {
    return 'No saved time blocks';
  }

  const byWeekday = new Map<number, TemplateSlot[]>();
  for (const slot of slots) {
    const existing = byWeekday.get(slot.weekday) ?? [];
    existing.push(slot);
    byWeekday.set(slot.weekday, existing);
  }

  const weekdays = [...byWeekday.keys()].sort((a, b) => a - b);
  const weekdayLabelMap = new Map<number, string>([
    [0, 'Sun'],
    [1, 'Mon'],
    [2, 'Tue'],
    [3, 'Wed'],
    [4, 'Thu'],
    [5, 'Fri'],
    [6, 'Sat'],
  ]);

  const weekdaysKey = weekdays.join(',');

  if (weekdaysKey === '0,6') {
    const weekendSlots = [...(byWeekday.get(0) ?? []), ...(byWeekday.get(6) ?? [])];
    const weekendRange = formatTemplateTimeRange(
      weekendSlots.filter(
        (slot, idx, arr) =>
          arr.findIndex(
            (other) => other.hour === slot.hour && other.minute === slot.minute
          ) === idx
      )
    );
    if (weekendRange) {
      return `Weekends only · ${weekendRange}`;
    }
    return 'Weekends only';
  }

  const sameSlotsEveryDay =
    weekdays.length > 0 &&
    weekdays.every((weekday) => {
      const daySlots = (byWeekday.get(weekday) ?? [])
        .slice()
        .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
        .map((slot) => `${slot.hour}:${slot.minute}`);
      const firstSlots = (byWeekday.get(weekdays[0]) ?? [])
        .slice()
        .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
        .map((slot) => `${slot.hour}:${slot.minute}`);
      return JSON.stringify(daySlots) === JSON.stringify(firstSlots);
    });

  const groupLabel =
    weekdays.length === 1
      ? weekdayLabelMap.get(weekdays[0]) ?? 'Saved'
      : weekdays.every((weekday, idx) => idx === 0 || weekday === weekdays[idx - 1] + 1)
      ? `${weekdayLabelMap.get(weekdays[0])}–${weekdayLabelMap.get(
          weekdays[weekdays.length - 1]
        )}`
      : weekdays.map((weekday) => weekdayLabelMap.get(weekday) ?? '').join(', ');

  if (sameSlotsEveryDay) {
    const firstDaySlots = byWeekday.get(weekdays[0]) ?? [];
    const range = formatTemplateTimeRange(firstDaySlots);
    if (range) {
      return `${groupLabel} · ${range}`;
    }
  }

  return `${slots.length} saved time blocks`;
}

function makeTemplateID() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  const selectedIfNeededTimes = useAppSelector(selectIfNeededDateTimes);
  const selectionKind = useAppSelector(selectSelectionKind);
  const meetingID = useAppSelector(selectCurrentMeetingID);
  const { respondents, selfRespondentID, scheduledStartDateTime, scheduledEndDateTime, dateMode } = useGetCurrentMeetingWithSelector(
    ({ data: meeting }) => ({
      respondents: meeting?.respondents,
      selfRespondentID: meeting?.selfRespondentID,
      scheduledStartDateTime: meeting?.scheduledStartDateTime,
      scheduledEndDateTime: meeting?.scheduledEndDateTime,
      dateMode: meeting?.dateMode ?? 'specific',
    })
  );
  assert(meetingID !== undefined && respondents !== undefined);

  const selfRespondentIDRef = useRef(selfRespondentID);
  const isScheduled = scheduledStartDateTime !== undefined && scheduledEndDateTime !== undefined;

  const scheduledDateTimeTitle = useMemo(() => {
    if (scheduledStartDateTime === undefined || scheduledEndDateTime === undefined) {
      return null;
    }

    const startDateTime =
      dateMode === 'dow'
        ? mapDowDateTimeToCurrentWeek(scheduledStartDateTime)
        : scheduledStartDateTime;

    const endDateTime =
      dateMode === 'dow'
        ? mapDowDateTimeToCurrentWeek(scheduledEndDateTime)
        : scheduledEndDateTime;

    return createTitleWithSchedule(startDateTime, endDateTime);
  }, [scheduledStartDateTime, scheduledEndDateTime, dateMode]);

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
  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false);
  const errorMessageElemRef = useRef<HTMLParagraphElement>(null);
  let title = 'Availabilities';
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const selectedUserNameRef = useRef<string | null>(null);

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateID, setSelectedTemplateID] = useState('');

  if (scheduledDateTimeTitle !== null) {
    title = scheduledDateTimeTitle;
  }

  useEffect(() => {
    const loadedTemplates = loadTemplates();
    const lastTemplateID = loadLastTemplateID();
    setTemplates(loadedTemplates);
    if (lastTemplateID && loadedTemplates.some((template) => template.id === lastTemplateID)) {
      setSelectedTemplateID(lastTemplateID);
    } else {
      setSelectedTemplateID('');
    }
  }, []);

  useEffect(() => {
    if (!selectedTemplateID) {
      clearLastTemplateID();
      return;
    }
    saveLastTemplateID(selectedTemplateID);
  }, [selectedTemplateID]);

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

  const error = submitSelf_error || updateRespondent_error || schedule_error || unschedule_error;

  useEffect(() => {
    if (error) {
      scrollUpIntoViewIfNeeded(errorMessageElemRef.current!, 48);
    }
  }, [error]);

  const clearErrors = () => {
    if (submitSelf_error) submitSelf_reset();
    if (updateRespondent_error) updateRespondent_reset();
    if (schedule_error) schedule_reset();
    if (unschedule_error) unschedule_reset();
  };

  const btnDisabled =
    submitSelf_isLoading || updateRespondent_isLoading || schedule_isLoading || unschedule_isLoading;

  const canUseTemplate =
    selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent';

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateID) ?? null;

  const persistTemplates = (nextTemplates: SavedTemplate[]) => {
    setTemplates(nextTemplates);
    saveTemplates(nextTemplates);
  };

  const onTemplateSelectChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSelectedTemplateID(event.target.value);
  };

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

    const name = window.prompt('Template name');
    if (!name) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast({
        msg: 'Template name cannot be empty',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    const slots = dedupeTemplateSlots(current);
    const now = new Date().toISOString();
    const template: SavedTemplate = {
      id: makeTemplateID(),
      name: trimmedName,
      slots,
      preview: summarizeTemplateSlots(slots),
      createdAt: now,
      updatedAt: now,
    };

    const nextTemplates = [...templates, template];
    persistTemplates(nextTemplates);
    setSelectedTemplateID(template.id);

    showToast({
      msg: 'Saved current availability as a template',
      msgType: 'success',
      autoClose: true,
    });
  };

  const onApplyTemplate = () => {
    if (!selectedTemplate) {
      showToast({
        msg: 'Choose a template first',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    const current = Object.keys(selectedTimes);
    const next = buildDateTimesFromTemplate(selectedTemplate.slots, allDateStrings);

    if (current.length > 0) {
      dispatch(removeDateTimesAndResetMouse(current));
    }
    if (next.length > 0) {
      dispatch(addDateTimesAndResetMouse(next));
    }

    showToast({
      msg: `Applied template "${selectedTemplate.name}"`,
      msgType: 'success',
      autoClose: true,
    });
  };

  const onRenameTemplate = (templateID: string) => {
    const template = templates.find((item) => item.id === templateID);
    if (!template) return;

    const nextName = window.prompt('Rename template', template.name);
    if (!nextName) return;

    const trimmedName = nextName.trim();
    if (!trimmedName) {
      showToast({
        msg: 'Template name cannot be empty',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    const nextTemplates = templates.map((item) =>
      item.id === templateID
        ? {
            ...item,
            name: trimmedName,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    persistTemplates(nextTemplates);

    showToast({
      msg: 'Template renamed',
      msgType: 'success',
      autoClose: true,
    });
  };

  const onDeleteTemplate = (templateID: string) => {
    const template = templates.find((item) => item.id === templateID);
    if (!template) return;

    const confirmed = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmed) return;

    const nextTemplates = templates.filter((item) => item.id !== templateID);
    persistTemplates(nextTemplates);

    if (selectedTemplateID === templateID) {
      setSelectedTemplateID(nextTemplates[0]?.id ?? '');
    }

    showToast({
      msg: 'Template deleted',
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
            ifNeededAvailabilities: Object.keys(selectedIfNeededTimes),
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
            ifNeededAvailabilities: Object.keys(selectedIfNeededTimes),
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
      const startDateTime =
        dateMode === 'dow'
          ? mapDowDateTimeToCurrentWeek(selectedTimesFlat[0])
          : selectedTimesFlat[0];

      const endDateTime =
        dateMode === 'dow'
          ? mapDowDateTimeToCurrentWeek(
              addMinutesToDateTimeString(
                selectedTimesFlat[selectedTimesFlat.length - 1],
                30
              )
            )
          : addMinutesToDateTimeString(
              selectedTimesFlat[selectedTimesFlat.length - 1],
              30
            );

      schedule({
        id: meetingID,
        scheduleMeetingDto: {
          startDateTime,
          endDateTime,
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
          {(selMode.type === 'addingRespondent' || selMode.type === 'editingRespondent') && (
            <div className="meeting-mode-tools">
              <div className="meeting-mode-card">
                <div className="meeting-mode-label">Availability type</div>
                <div className="meeting-mode-help">
                  Blue means preferred. Yellow means you can make it work if necessary.
                </div>
                <div className="meeting-mode-toggle" role="tablist" aria-label="Availability type">
                  <NonFocusButton
                    className={`meeting-mode-pill meeting-mode-pill-available ${
                      selectionKind === 'available' ? 'is-active' : ''
                    }`}
                    onClick={() => dispatch(setSelectionKind('available'))}
                    disabled={btnDisabled}
                  >
                    Available
                  </NonFocusButton>
                  <NonFocusButton
                    className={`meeting-mode-pill meeting-mode-pill-ifneeded ${
                      selectionKind === 'ifNeeded' ? 'is-active' : ''
                    }`}
                    onClick={() => dispatch(setSelectionKind('ifNeeded'))}
                    disabled={btnDisabled}
                  >
                    If needed
                  </NonFocusButton>
                </div>
              </div>

              {canUseTemplate && (
                <div className="meeting-template-card">
                  <div className="meeting-template-label">Templates</div>
                  <div className="meeting-template-help">
                    Apply a saved weekly pattern or save your current one.
                  </div>

                  <div className="meeting-template-body">
                    <select
                      className="form-select meeting-template-select"
                      value={selectedTemplateID}
                      onChange={onTemplateSelectChange}
                      disabled={btnDisabled || templates.length === 0}
                    >
                      <option value="">Choose a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>

                    <div className="meeting-template-preview">
                      {selectedTemplate
                        ? selectedTemplate.preview
                        : templates.length === 0
                        ? 'No saved templates yet. Save your current schedule to create one.'
                        : 'No template selected'}
                    </div>

                    <div className="meeting-template-actions">
                      <NonFocusButton
                        className="btn btn-primary meeting-avl-button"
                        onClick={onApplyTemplate}
                        disabled={btnDisabled || !selectedTemplate}
                      >
                        Apply
                      </NonFocusButton>
                      <NonFocusButton
                        className="btn btn-outline-secondary meeting-avl-button"
                        onClick={onSaveTemplate}
                        disabled={btnDisabled}
                      >
                        Save current
                      </NonFocusButton>
                      <NonFocusButton
                        className="btn btn-outline-secondary meeting-avl-button"
                        onClick={() => setShowManageTemplatesModal(true)}
                        disabled={btnDisabled || templates.length === 0}
                      >
                        Manage
                      </NonFocusButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

      <InfoModal show={showManageTemplatesModal} setShow={setShowManageTemplatesModal}>
        <div className="meeting-template-manage">
          <div className="meeting-template-manage-title">Manage templates</div>

          {templates.length === 0 ? (
            <p className="mb-0 text-center">No saved templates yet.</p>
          ) : (
            <div className="meeting-template-manage-list">
              {templates.map((template) => (
                <div key={template.id} className="meeting-template-manage-item">
                  <div className="meeting-template-manage-copy">
                    <div className="meeting-template-manage-name">{template.name}</div>
                    <div className="meeting-template-manage-preview">{template.preview}</div>
                  </div>

                  <div className="meeting-template-manage-actions">
                    <NonFocusButton
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => onRenameTemplate(template.id)}
                    >
                      Rename
                    </NonFocusButton>
                    <NonFocusButton
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      Delete
                    </NonFocusButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
