import { useEffect, useRef, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { to12HourClock, tzAbbr } from 'utils/dates.utils';
import { range } from 'utils/arrays.utils';

export default function MeetingTimesPrompt({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
}: {
  startTime: number,
  setStartTime: (time: number) => void,
  endTime: number,
  setEndTime: (time: number) => void,
}) {
  return (
    <fieldset className="create-meeting-form-group">
      <legend className="create-meeting-question">What time window should people consider?</legend>
      <div className="d-flex align-items-center">
        <TimePicker
          hour={startTime}
          setHour={setStartTime}
          label="Earliest realistic start"
          popupID="start-time-popup"
        />
        <p className="py-0 px-3 m-0">to</p>
        <TimePicker
          hour={endTime}
          setHour={setEndTime}
          label="Latest realistic end"
          popupID="end-time-popup"
        />
        <p className="py-0 ps-3 m-0">{tzAbbr}</p>
      </div>
    </fieldset>
  );
}

function TimePicker({
  hour: hour24,
  setHour: setHour24,
  label,
  popupID,
}: {
  hour: number,
  setHour: (val: number) => void,
  label: string,
  popupID: string,
}) {
  const [show, setShow] = useState(false);
  const inputOrPickerClicked = useRef(false);

  useEffect(() => {
    const listener = () => {
      if (inputOrPickerClicked.current) {
        setShow(true);
        inputOrPickerClicked.current = false;
      } else {
        setShow(false);
      }
    };
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
  }, []);

  return (
    <div className="position-relative">
      <Form.Control
        readOnly
        aria-label={label}
        value={to12HourClock(hour24)}
        className="form-text-input"
        onClick={() => {
          inputOrPickerClicked.current = true;
        }}
      />
      {show && (
        <div
          className="meeting-times-picker position-absolute mt-2 d-flex"
          id={popupID}
          onClick={() => {
            inputOrPickerClicked.current = true;
          }}
        >
          <div className="meeting-times-picker-top w-100 position-absolute d-none">
            {label}
          </div>
          <ul className="meeting-times-picker-left">
            {range(0, 24).map(hour => (
              <li
                key={hour}
                className={hour === hour24 ? 'selected' : ''}
                onClick={() => setHour24(hour)}
              >
                {String(hour).padStart(2, '0')}
              </li>
            ))}
          </ul>
          <ul className="meeting-times-picker-right">
            {range(0, 24).map(hour => (
              <li
                key={hour}
                className={hour === hour24 ? 'selected' : ''}
                onClick={() => setHour24(hour)}
              >
                {to12HourClock(hour)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
