import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import MeetingForm from 'components/MeetingForm';
import { selectSelectedDates, setSelectedDates } from 'slices/selectedDates';
import { selectDateSelectionMode, setDateSelectionMode } from 'slices/dateSelectionMode';
import {
  addWeekday,
  removeWeekday,
  selectSelectedWeekdays,
} from 'slices/selectedWeekdays';
import { canonicalDowLabels } from 'utils/dowDates';
import './DayPicker.css';
import Calendar from './Calendar';
import { useTodayString } from 'utils/dates.utils';
import useSetTitle from 'utils/title.hook';

export default function DayPicker() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [clickedCreateButton, setClickedCreateButton] = useState(false);
  const todayString = useTodayString();

  const dateSelectionMode = useAppSelector(selectDateSelectionMode);
  const selectedWeekdays = useAppSelector(selectSelectedWeekdays);

  const atLeastOneDateSelected = useAppSelector(
    state => Object.keys(selectSelectedDates(state)).length > 0
  );
  const atLeastOneWeekdaySelected = Object.keys(selectedWeekdays).length > 0;
  const continueDisabled =
    dateSelectionMode === 'specific'
      ? !atLeastOneDateSelected
      : !atLeastOneWeekdaySelected;

  useSetTitle('Scheduler');

  useEffect(() => {
    dispatch(setSelectedDates({ [todayString]: true }));
  }, [dispatch, todayString]);

  useEffect(() => {
    if (pathname === '/create' && !clickedCreateButton) {
      navigate('/');
    }
  }, [pathname, clickedCreateButton, navigate]);

  if (clickedCreateButton && pathname === '/create') {
    return <MeetingForm />;
  }

  const onClick = () => {
    setClickedCreateButton(true);
    navigate('/create');
  };

  return (
    <div className="vw-daypicker-page">
      <section className="vw-section-card vw-daypicker-intro d-flex flex-column flex-md-row align-items-md-center justify-content-md-between">
        <div className="vw-copy-block">
          <div className="vw-kicker">Production scheduling</div>
          <h1 className="vw-page-title">Which days would you like to meet on?</h1>
        </div>

        <button
          className="btn btn-primary px-4 d-none d-md-block"
          onClick={onClick}
          disabled={continueDisabled}
        >
          Continue
        </button>
      </section>

      <section className="vw-section-card vw-calendar-shell">
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

          {dateSelectionMode === 'dow' && (
            <div className="vw-chip">
              Pick recurring weekdays instead of exact calendar dates
            </div>
          )}
        </div>

        {dateSelectionMode === 'specific' ? (
          <div className="vw-calendar-wrap">
            <Calendar firstVisibleDate={todayString} />
          </div>
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
      </section>

      <BottomOverlay>
        <button
          className="btn btn-primary px-4"
          onClick={onClick}
          disabled={continueDisabled}
        >
          Continue
        </button>
      </BottomOverlay>
    </div>
  );
}
