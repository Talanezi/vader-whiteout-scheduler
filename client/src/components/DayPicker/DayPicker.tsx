import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import BottomOverlay from 'components/BottomOverlay';
import MeetingForm from 'components/MeetingForm';
import { selectSelectedDates, setSelectedDates } from 'slices/selectedDates';
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

  const atLeastOneDateSelected = useAppSelector(
    state => Object.keys(selectSelectedDates(state)).length > 0
  );

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
          <h1 className="vw-page-title">Select candidate production dates</h1>
          <p className="vw-page-note">
            Choose the days your crew could realistically make work, then build a
            shareable scheduling block for rehearsals, shoots, fittings, scouts,
            pickups, or reviews.
          </p>
        </div>

        <button
          className="btn btn-primary px-4 d-none d-md-block"
          onClick={onClick}
          disabled={!atLeastOneDateSelected}
        >
          Continue
        </button>
      </section>

      <section className="vw-section-card vw-calendar-shell">
        <div className="vw-calendar-wrap">
          <Calendar firstVisibleDate={todayString} />
        </div>
      </section>

      <BottomOverlay>
        <button
          className="btn btn-primary px-4"
          onClick={onClick}
          disabled={!atLeastOneDateSelected}
        >
          Continue
        </button>
      </BottomOverlay>
    </div>
  );
}
