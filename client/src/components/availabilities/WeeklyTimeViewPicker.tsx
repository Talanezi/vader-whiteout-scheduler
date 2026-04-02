import React, { useMemo, useReducer } from 'react';
import { LeftArrow as SVGLeftArrow, RightArrow as SVGRightArrow } from 'components/Arrows';
import {
  getDateFromString,
  getDayOfWeekAbbr,
  getMonthAbbr,
  getYearMonthDayFromDateString,
  tzAbbr,
} from 'utils/dates.utils';
import AvailabilitiesRow from './AvailabilitiesRow';
import MeetingGridBodyCells from './MeetingGridBodyCells';
import MeetingRespondents from './MeetingRespondents';
import { range } from 'utils/arrays.utils';
import { assert } from 'utils/misc.utils';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { useAppSelector } from 'app/hooks';
import { selectSelMode } from 'slices/availabilitiesSelection';

function generateGridTemplateAreas(numSchedRows: number, numSchedCols: number): string {
  const rows: string[][] = [];
  let e = 0;
  let c = 0;

  let row: string[] = [];
  row.push(`e${e++}`);
  row.push(`e${e++}`);
  for (let i = 0; i < numSchedCols; i++) row.push('m');
  row.push(`e${e++}`);
  rows.push(row);

  row = [];
  row.push(`e${e++}`);
  row.push(`e${e++}`);
  for (let i = 0; i < numSchedCols; i++) row.push(`w${i}`);
  row.push(`e${e++}`);
  rows.push(row);

  for (let i = 0; i < numSchedRows; i++) {
    row = [];
    row.push('l');
    if (i % 2 === 0) {
      row.push(`t${i / 2}`);
    } else {
      row.push(`e${e++}`);
    }
    for (let j = 0; j < numSchedCols; j++) {
      row.push(`c${c++}`);
    }
    row.push('r');
    rows.push(row);
  }

  return rows.map(r => `"${r.join(' ')}"`).join(' ');
}

function pageNumberReducer(page: number, action: 'inc' | 'dec'): number {
  return action === 'inc' ? page + 1 : page - 1;
}

export default function WeeklyViewTimePicker() {
  const { startTime, endTime, dates } = useGetCurrentMeetingWithSelector(({ data: meeting }) => ({
    startTime: meeting?.minStartHour,
    endTime: meeting?.maxEndHour,
    dates: meeting?.tentativeDates,
  }));

  assert(startTime !== undefined && endTime !== undefined && dates !== undefined);

  const startHour = Math.floor(startTime);
  const endHour = Math.ceil(endTime);
  const [page, pageDispatch] = useReducer(pageNumberReducer, 0);
  const numDaysDisplayed = Math.min(dates.length - page * 7, 7);

  const datesDisplayed = useMemo(
    () => dates.slice(page * 7, page * 7 + numDaysDisplayed),
    [dates, page, numDaysDisplayed],
  );

  const numCols = numDaysDisplayed;
  const numRows = 2 * (startHour < endHour ? endHour - startHour : endHour + 24 - startHour);

  const gridTemplateAreas = useMemo(
    () => generateGridTemplateAreas(numRows, numDaysDisplayed),
    [numRows, numDaysDisplayed],
  );

  const selModeType = useAppSelector(state => selectSelMode(state).type);

  const className = useMemo(() => {
    let result = 'weeklyview-grid';
    if (
      selModeType === 'addingRespondent' ||
      selModeType === 'editingRespondent' ||
      selModeType === 'editingSchedule'
    ) {
      result += ' canSelectDates';
    }
    return result;
  }, [selModeType]);

  const moreDaysToLeft = page > 0;
  const moreDaysToRight = dates.length - page * 7 > 7;

  return (
    <>
      <AvailabilitiesRow
        moreDaysToRight={moreDaysToRight}
        pageDispatch={pageDispatch}
        allDateStrings={dates}
      />
      <div className="d-md-flex mt-3 mt-md-5">
        <div className="flex-md-grow-1">
          <div className="vw-weekly-shell">
            <div
              className={className}
              style={{
                display: 'grid',
                gridTemplateColumns: `auto auto repeat(${numDaysDisplayed}, minmax(3em, 1fr)) auto`,
                gridTemplateRows: `auto auto repeat(${numRows}, 1.95em)`,
                gridTemplateAreas,
              }}
            >
              <MeetingGridMonthTextCell dateStrings={datesDisplayed} />
              <MeetingGridDayOfWeekCells dateStrings={datesDisplayed} />
              <MeetingTimesHoursColumn startHour={startHour} endHour={endHour} />
              <MeetingDaysLeftArrow moreDaysToLeft={moreDaysToLeft} pageDispatch={pageDispatch} />
              <MeetingGridBodyCells
                numRows={numRows}
                numCols={numCols}
                startHour={startHour}
                dateStrings={datesDisplayed}
              />
              <MeetingDaysRightArrow moreDaysToRight={moreDaysToRight} pageDispatch={pageDispatch} />
            </div>
            <div className="weeklyview__local_time_box">
              Shown in local time ({tzAbbr})
            </div>
          </div>
        </div>
        <MeetingRespondents />
      </div>
    </>
  );
}

const MeetingGridMonthTextCell = React.memo(function MeetingGridMonthTextCell({
  dateStrings,
}: {
  dateStrings: string[];
}) {
  const [startYear, startMonth] = getYearMonthDayFromDateString(dateStrings[0]);
  const [endYear, endMonth] = getYearMonthDayFromDateString(dateStrings[dateStrings.length - 1]);
  const startDateText = `${getMonthAbbr(startMonth - 1, false)} ${startYear}`;
  const endDateText = `${getMonthAbbr(endMonth - 1, false)} ${endYear}`;
  const dateText = startDateText === endDateText ? startDateText : `${startDateText}  -  ${endDateText}`;

  return <div className="weeklyview-grid__monthtext">{dateText}</div>;
});

const MeetingGridDayOfWeekCells = React.memo(function MeetingGridDayOfWeekCells({
  dateStrings,
}: {
  dateStrings: string[];
}) {
  return (
    <>
      {dateStrings.map((dateString, i) => {
        const date = getDateFromString(dateString);
        return (
          <div
            key={dateString}
            className="weeklyview__colheadercell"
            style={{ gridArea: `w${i}` }}
          >
            <div>{getDayOfWeekAbbr(date).toUpperCase()}</div>
            <div style={{ fontSize: '1.5em' }}>{date.getDate()}</div>
          </div>
        );
      })}
    </>
  );
});

const MeetingTimesHoursColumn = React.memo(function MeetingTimesHoursColumn({
  startHour,
  endHour,
}: {
  startHour: number;
  endHour: number;
}) {
  const hoursDiff = startHour < endHour ? endHour - startHour : endHour + 24 - startHour;

  return (
    <>
      {range(hoursDiff).map(i => {
        const hour = (startHour + i) % 24;
        const hourStr = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
        return (
          <div
            key={hour}
            className="weeklyview__hourcell"
            style={{ gridArea: `t${i}` }}
          >
            {hourStr}
          </div>
        );
      })}
    </>
  );
});

const MeetingDaysLeftArrow = React.memo(function MeetingDaysLeftArrow({
  moreDaysToLeft,
  pageDispatch,
}: {
  moreDaysToLeft: boolean;
  pageDispatch: React.Dispatch<'inc' | 'dec'>;
}) {
  return (
    <div
      style={{
        visibility: moreDaysToLeft ? 'visible' : 'hidden',
        gridArea: 'l',
      }}
      className="d-flex align-items-center"
    >
      <SVGLeftArrow className="meeting-days-arrow me-2" onClick={() => moreDaysToLeft && pageDispatch('dec')} />
    </div>
  );
});

const MeetingDaysRightArrow = React.memo(function MeetingDaysRightArrow({
  moreDaysToRight,
  pageDispatch,
}: {
  moreDaysToRight: boolean;
  pageDispatch: React.Dispatch<'inc' | 'dec'>;
}) {
  return (
    <div
      style={{
        visibility: moreDaysToRight ? 'visible' : 'hidden',
        gridArea: 'r',
      }}
      className="d-flex align-items-center"
    >
      <SVGRightArrow className="meeting-days-arrow ms-2" onClick={() => moreDaysToRight && pageDispatch('inc')} />
    </div>
  );
});
