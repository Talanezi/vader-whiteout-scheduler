import { useEffect, useMemo, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { tzAbbr } from 'utils/dates.utils';

function toLabel(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'pm' : 'am';
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12} ${suffix}`;
}

function toPieces(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  return {
    hour12: normalized % 12 === 0 ? 12 : normalized % 12,
    meridiem: normalized >= 12 ? 'pm' : 'am',
  } as const;
}

function fromPieces(hour12: number, meridiem: 'am' | 'pm') {
  if (meridiem === 'am') {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

function TimeDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { hour12, meridiem } = useMemo(() => toPieces(value), [value]);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="vw-time-dropdown" ref={rootRef}>
      <div className="vw-time-dropdown-label">{label}</div>

      <button
        type="button"
        className="vw-time-trigger"
        onClick={() => setOpen(prev => !prev)}
      >
        {toLabel(value)}
      </button>

      {open && (
        <div className="vw-time-panel">
          <div className="vw-time-panel-top">{toLabel(value)}</div>
          <div className="vw-time-panel-body">
            <ul className="vw-time-hours" role="listbox" aria-label={`${label} hour`}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <li
                  key={h}
                  className={h === hour12 ? 'selected' : ''}
                  onClick={() => onChange(fromPieces(h, meridiem))}
                >
                  {String(h).padStart(2, '0')}
                </li>
              ))}
            </ul>

            <ul className="vw-time-meridiem" role="listbox" aria-label={`${label} am pm`}>
              {(['am', 'pm'] as const).map((m) => (
                <li
                  key={m}
                  className={m === meridiem ? 'selected' : ''}
                  onClick={() => onChange(fromPieces(hour12, m))}
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingTimesPrompt({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
}: {
  startTime: number;
  setStartTime: (time: number) => void;
  endTime: number;
  setEndTime: (time: number) => void;
}) {
  const timezoneText = tzAbbr();

  return (
    <Form.Group className="create-meeting-form-group">
      <Form.Label className="create-meeting-question">
        What time window should people consider?
      </Form.Label>

      <div className="vw-time-range-row">
        <TimeDropdown label="Start" value={startTime} onChange={setStartTime} />
        <div className="vw-time-range-sep">to</div>
        <TimeDropdown label="End" value={endTime} onChange={setEndTime} />
        <div className="vw-timezone-pill">{timezoneText}</div>
      </div>

      {endTime <= startTime && (
        <p className="text-danger mt-3 mb-0">
          End time must be later than start time.
        </p>
      )}
    </Form.Group>
  );
}
