import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import NonFocusButton from 'components/NonFocusButton';
import { useToast } from 'components/Toast';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import {
  addDateTimesAndResetMouse,
  removeDateTimesAndResetMouse,
  selectSelectedTimes,
  selectSelMode,
} from 'slices/availabilitiesSelection';
import {
  customToISOString,
  getDateFromString,
  to12HourClock,
} from 'utils/dates.utils';

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

type TemplateBuilderState = {
  id: string | null;
  name: string;
  slots: TemplateSlot[];
};

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    if (currentMinutes - prevMinutes !== 30) return null;
  }

  const start = sorted[0];
  const last = sorted[sorted.length - 1];
  const endDate = new Date(2000, 0, 1, last.hour, last.minute + 30);

  return `${to12HourClock(start.hour)} ${start.hour < 12 ? 'AM' : 'PM'}–${to12HourClock(endDate.getHours())} ${endDate.getHours() < 12 ? 'AM' : 'PM'}`;
}

function summarizeTemplateSlots(slots: TemplateSlot[]): string {
  if (slots.length === 0) return 'No saved time blocks';

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

  if (weekdays.join(',') === '0,6') {
    const weekendSlots = [...(byWeekday.get(0) ?? []), ...(byWeekday.get(6) ?? [])];
    const uniqueWeekendSlots = weekendSlots.filter(
      (slot, idx, arr) =>
        arr.findIndex(
          (other) => other.hour === slot.hour && other.minute === slot.minute
        ) === idx
    );
    const range = formatTemplateTimeRange(uniqueWeekendSlots);
    return range ? `Weekends only · ${range}` : 'Weekends only';
  }

  const groupLabel =
    weekdays.length === 1
      ? weekdayLabelMap.get(weekdays[0]) ?? 'Saved'
      : weekdays.every((weekday, idx) => idx === 0 || weekday === weekdays[idx - 1] + 1)
      ? `${weekdayLabelMap.get(weekdays[0])}–${weekdayLabelMap.get(weekdays[weekdays.length - 1])}`
      : weekdays.map((weekday) => weekdayLabelMap.get(weekday) ?? '').join(', ');

  const firstDaySlots = byWeekday.get(weekdays[0]) ?? [];
  const sameSlotsEveryDay = weekdays.every((weekday) => {
    const daySlots = (byWeekday.get(weekday) ?? [])
      .slice()
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
      .map((slot) => `${slot.hour}:${slot.minute}`);
    const baseSlots = firstDaySlots
      .slice()
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
      .map((slot) => `${slot.hour}:${slot.minute}`);
    return JSON.stringify(daySlots) === JSON.stringify(baseSlots);
  });

  if (sameSlotsEveryDay) {
    const range = formatTemplateTimeRange(firstDaySlots);
    if (range) return `${groupLabel} · ${range}`;
  }

  return `${slots.length} saved time blocks`;
}

function makeTemplateID() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function groupTemplateSlotsByWeekday(slots: TemplateSlot[]) {
  const byDay = new Map<number, TemplateSlot[]>();
  for (let day = 0; day < 7; day += 1) byDay.set(day, []);
  for (const slot of slots) byDay.get(slot.weekday)?.push(slot);
  for (const [day, daySlots] of byDay.entries()) {
    byDay.set(
      day,
      daySlots.slice().sort((a, b) => a.hour - b.hour || a.minute - b.minute)
    );
  }
  return byDay;
}

function compressDaySlotsToRanges(slots: TemplateSlot[]) {
  if (slots.length === 0) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  let rangeStart = slots[0].hour * 60 + slots[0].minute;
  let prev = rangeStart;

  for (let i = 1; i < slots.length; i += 1) {
    const current = slots[i].hour * 60 + slots[i].minute;
    if (current !== prev + 30) {
      ranges.push({ start: rangeStart, end: prev + 30 });
      rangeStart = current;
    }
    prev = current;
  }

  ranges.push({ start: rangeStart, end: prev + 30 });
  return ranges;
}

function TemplateMiniPreview({ slots }: { slots: TemplateSlot[] }) {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const byDay = groupTemplateSlotsByWeekday(slots);

  return (
    <div className="template-mini-preview" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const daySlots = byDay.get(day) ?? [];
        const ranges = compressDaySlotsToRanges(daySlots);

        return (
          <div key={day} className="template-mini-day">
            <div className="template-mini-day-label">{labels[day]}</div>
            <div className="template-mini-day-track">
              {ranges.map((range, idx) => {
                const left = (range.start / 1440) * 100;
                const width = ((range.end - range.start) / 1440) * 100;
                return (
                  <span
                    key={idx}
                    className="template-mini-day-bar"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildTemplateBuilderState(template?: SavedTemplate): TemplateBuilderState {
  if (!template) {
    return {
      id: null,
      name: '',
      slots: [],
    };
  }

  return {
    id: template.id,
    name: template.name,
    slots: template.slots.slice().sort(
      (a, b) => a.weekday - b.weekday || a.hour - b.hour || a.minute - b.minute
    ),
  };
}

function hasBuilderSlot(slots: TemplateSlot[], weekday: number, hour: number, minute: number) {
  return slots.some(
    (slot) => slot.weekday === weekday && slot.hour === hour && slot.minute === minute
  );
}

function toggleBuilderSlot(slots: TemplateSlot[], weekday: number, hour: number, minute: number) {
  const exists = hasBuilderSlot(slots, weekday, hour, minute);
  if (exists) {
    return slots.filter(
      (slot) => !(slot.weekday === weekday && slot.hour === hour && slot.minute === minute)
    );
  }

  return [...slots, { weekday, hour, minute }].sort(
    (a, b) => a.weekday - b.weekday || a.hour - b.hour || a.minute - b.minute
  );
}

export default function WeeklyTemplatesStrip({
  allDateStrings,
}: {
  allDateStrings: string[];
}) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const selModeType = useAppSelector((state) => selectSelMode(state).type);
  const selectedTimes = useAppSelector(selectSelectedTimes);
  const canUseTemplate =
    selModeType === 'addingRespondent' || selModeType === 'editingRespondent';

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateID, setSelectedTemplateID] = useState('');
  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false);
  const [showTemplateBuilderModal, setShowTemplateBuilderModal] = useState(false);
  const [templateBuilder, setTemplateBuilder] = useState<TemplateBuilderState>(
    buildTemplateBuilderState()
  );

  useEffect(() => {
    const loadedTemplates = loadTemplates();
    const lastTemplateID = loadLastTemplateID();
    setTemplates(loadedTemplates);
    if (lastTemplateID && loadedTemplates.some((template) => template.id === lastTemplateID)) {
      setSelectedTemplateID(lastTemplateID);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplateID) {
      saveLastTemplateID(selectedTemplateID);
    }
  }, [selectedTemplateID]);

  if (!canUseTemplate) return null;

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateID) ?? null;

  const persistTemplates = (nextTemplates: SavedTemplate[]) => {
    setTemplates(nextTemplates);
    saveTemplates(nextTemplates);
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
    if (!name?.trim()) return;

    const slots = dedupeTemplateSlots(current);
    const now = new Date().toISOString();
    const template: SavedTemplate = {
      id: makeTemplateID(),
      name: name.trim(),
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
    if (!selectedTemplate) return;

    const current = Object.keys(selectedTimes);
    const next = buildDateTimesFromTemplate(selectedTemplate.slots, allDateStrings);

    if (current.length > 0) dispatch(removeDateTimesAndResetMouse(current));
    if (next.length > 0) dispatch(addDateTimesAndResetMouse(next));

    showToast({
      msg: `Applied template "${selectedTemplate.name}"`,
      msgType: 'success',
      autoClose: true,
    });
  };

  const openTemplateBuilderStub = (template?: SavedTemplate) => {
    setTemplateBuilder(buildTemplateBuilderState(template));
    setShowTemplateBuilderModal(true);
  };

  const builderWeekdays = [
    { day: 0, label: 'Sun' },
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
  ];

  const builderHours = Array.from({ length: 16 }, (_, idx) => 8 + idx);

  const saveTemplateFromBuilder = () => {
    const name = templateBuilder.name.trim();
    const slots = templateBuilder.slots.slice().sort(
      (a, b) => a.weekday - b.weekday || a.hour - b.hour || a.minute - b.minute
    );

    if (!name) {
      showToast({
        msg: 'Template name is required',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    if (slots.length === 0) {
      showToast({
        msg: 'Choose at least one weekday and a valid time range',
        msgType: 'success',
        autoClose: true,
      });
      return;
    }

    const now = new Date().toISOString();
    const preview = summarizeTemplateSlots(slots);

    if (templateBuilder.id) {
      const nextTemplates = templates.map((template) =>
        template.id === templateBuilder.id
          ? {
              ...template,
              name,
              slots,
              preview,
              updatedAt: now,
            }
          : template
      );
      persistTemplates(nextTemplates);
      setSelectedTemplateID(templateBuilder.id);
      showToast({
        msg: 'Template updated',
        msgType: 'success',
        autoClose: true,
      });
    } else {
      const template: SavedTemplate = {
        id: makeTemplateID(),
        name,
        slots,
        preview,
        createdAt: now,
        updatedAt: now,
      };
      const nextTemplates = [...templates, template];
      persistTemplates(nextTemplates);
      setSelectedTemplateID(template.id);
      showToast({
        msg: 'Template created',
        msgType: 'success',
        autoClose: true,
      });
    }

    setShowTemplateBuilderModal(false);
  };

  return (
    <>
      <div className="meeting-template-strip meeting-template-strip-below-grid">
        <div className="meeting-template-strip-copy">
          <div className="meeting-template-label">Weekly templates</div>
          <div className="meeting-template-help">
            Apply a saved weekly pattern, save the current selection, or create one from scratch.
          </div>
        </div>

        <div className="meeting-template-strip-controls">
          <select
            className="form-select meeting-template-select"
            value={selectedTemplateID}
            onChange={(event) => setSelectedTemplateID(event.target.value)}
            disabled={templates.length === 0}
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

          <div className="meeting-template-actions meeting-template-actions-inline">
            <NonFocusButton
              className="btn btn-outline-secondary meeting-avl-button"
              onClick={onSaveTemplate}
            >
              Save current
            </NonFocusButton>
            <NonFocusButton
              className="btn btn-outline-secondary meeting-avl-button"
              onClick={() => setShowManageTemplatesModal(true)}
              disabled={templates.length === 0}
            >
              Template Studio
            </NonFocusButton>
          </div>
        </div>
      </div>

      <Modal
        backdrop="static"
        show={showManageTemplatesModal}
        onHide={() => setShowManageTemplatesModal(false)}
        centered
        dialogClassName="meeting-template-library-modal"
      >
        <Modal.Header closeButton className="border-bottom-0 pb-2">
          <div className="meeting-template-library-header">
            <div className="meeting-template-library-header-copy">
              <Modal.Title>Template Library</Modal.Title>
              <div className="meeting-template-library-subtitle">
                Reuse, review, and manage your weekly patterns.
              </div>
            </div>
            <NonFocusButton
              className="btn btn-primary btn-sm meeting-template-library-add-btn"
              onClick={() => openTemplateBuilderStub()}
            >
              + Add template
            </NonFocusButton>
          </div>
        </Modal.Header>

        <Modal.Body className="meeting-template-library-body">
          <div className="meeting-template-manage">
            {templates.length === 0 ? (
              <p className="mb-0 text-center">No saved templates yet.</p>
            ) : (
              <div className="meeting-template-manage-list">
                {templates.map((template) => (
                  <div key={template.id} className="meeting-template-manage-item">
                    <div className="meeting-template-manage-copy">
                      <div className="meeting-template-manage-name">{template.name}</div>
                      <div className="meeting-template-manage-preview">{template.preview}</div>
                      <TemplateMiniPreview slots={template.slots} />
                    </div>

                    <div className="meeting-template-manage-actions">
                      <NonFocusButton
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedTemplateID(template.id);
                          const current = Object.keys(selectedTimes);
                          const next = buildDateTimesFromTemplate(template.slots, allDateStrings);

                          if (current.length > 0) dispatch(removeDateTimesAndResetMouse(current));
                          if (next.length > 0) dispatch(addDateTimesAndResetMouse(next));

                          showToast({
                            msg: `Applied template "${template.name}"`,
                            msgType: 'success',
                            autoClose: true,
                          });
                          setShowManageTemplatesModal(false);
                        }}
                      >
                        Apply
                      </NonFocusButton>
                      <NonFocusButton
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openTemplateBuilderStub(template)}
                      >
                        Edit
                      </NonFocusButton>
                      <NonFocusButton
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          const nextName = window.prompt('Rename template', template.name);
                          if (!nextName?.trim()) return;
                          persistTemplates(
                            templates.map((item) =>
                              item.id === template.id
                                ? { ...item, name: nextName.trim(), updatedAt: new Date().toISOString() }
                                : item
                            )
                          );
                        }}
                      >
                        Rename
                      </NonFocusButton>
                      <NonFocusButton
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => {
                          if (!window.confirm(`Delete template "${template.name}"?`)) return;
                          const nextTemplates = templates.filter((item) => item.id !== template.id);
                          persistTemplates(nextTemplates);
                          if (selectedTemplateID === template.id) {
                            setSelectedTemplateID(nextTemplates[0]?.id ?? '');
                          }
                        }}
                      >
                        Delete
                      </NonFocusButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-2">
          <NonFocusButton
            className="btn btn-outline-secondary custom-btn-min-width"
            onClick={() => setShowManageTemplatesModal(false)}
          >
            Done
          </NonFocusButton>
        </Modal.Footer>
      </Modal>

      <Modal
        backdrop="static"
        show={showTemplateBuilderModal}
        onHide={() => setShowTemplateBuilderModal(false)}
        centered
        dialogClassName="meeting-template-builder-modal"
      >
        <Modal.Header closeButton className="border-bottom-0 pb-2">
          <Modal.Title>
            {templateBuilder.id ? 'Edit Template' : 'Add Template'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="meeting-template-builder-body">
          <Form.Group className="mb-3">
            <Form.Label className="form-text-label">Template name</Form.Label>
            <Form.Control
              value={templateBuilder.name}
              onChange={(event) =>
                setTemplateBuilder((currentBuilder) => ({
                  ...currentBuilder,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. Weeknight evenings"
            />
          </Form.Group>

          <div className="template-builder-grid-shell">
            <div className="template-builder-grid-header">
              <div className="template-builder-corner" />
              {builderWeekdays.map(({ day, label }) => (
                <div key={day} className="template-builder-day-label">
                  {label}
                </div>
              ))}
            </div>

            <div className="template-builder-grid-body">
              {builderHours.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="template-builder-time-label">
                    {to12HourClock(hour)} {hour < 12 ? 'AM' : 'PM'}
                  </div>
                  {builderWeekdays.map(({ day }) => (
                    <React.Fragment key={`${day}-${hour}`}>
                      {[0, 30].map((minute) => (
                        <button
                          key={`${day}-${hour}-${minute}`}
                          type="button"
                          className={`template-builder-cell ${
                            hasBuilderSlot(templateBuilder.slots, day, hour, minute)
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() =>
                            setTemplateBuilder((currentBuilder) => ({
                              ...currentBuilder,
                              slots: toggleBuilderSlot(currentBuilder.slots, day, hour, minute),
                            }))
                          }
                          aria-label={`${day}-${hour}-${minute}`}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-2">
          <NonFocusButton
            className="btn btn-outline-secondary custom-btn-min-width"
            onClick={() => setShowTemplateBuilderModal(false)}
          >
            Cancel
          </NonFocusButton>
          <NonFocusButton
            className="btn btn-primary custom-btn-min-width"
            onClick={saveTemplateFromBuilder}
          >
            {templateBuilder.id ? 'Save Changes' : 'Create Template'}
          </NonFocusButton>
        </Modal.Footer>
      </Modal>
    </>
  );
}
