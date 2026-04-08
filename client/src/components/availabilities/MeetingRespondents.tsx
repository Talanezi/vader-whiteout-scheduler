import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from 'app/hooks';
import type { Style } from 'common/types';
import {
  selectSelMode,
  selectHoverDateTime,
  setHoverUser,
  resetSelection,
  selectUser,
} from 'slices/availabilitiesSelection';
import { useGetCurrentMeetingWithSelector } from 'utils/meetings.hooks';
import { assert } from 'utils/misc.utils';

type DateTimePeopleSet = {
  [dateTime: string]: {
    [userID: string]: true;
  };
};

function buildDateTimePeopleSet(
  respondents: Record<string, { [dateTime: string]: boolean }>
): DateTimePeopleSet {
  const result: DateTimePeopleSet = {};
  for (const [respondentID, dateTimes] of Object.entries(respondents)) {
    for (const dateTime of Object.keys(dateTimes || {})) {
      if (!result[dateTime]) result[dateTime] = {};
      result[dateTime][respondentID] = true;
    }
  }
  return result;
}

function MeetingRespondents() {
  const { respondents } = useGetCurrentMeetingWithSelector(({ data: meeting }) => ({
    respondents: meeting?.respondents,
  }));
  assert(respondents !== undefined);

  const respondentIDs = Object.keys(respondents).map(s => +s);

  const dateTimePeople: DateTimePeopleSet = useMemo(() => {
    const source: Record<string, { [dateTime: string]: boolean }> = {};
    for (const [respondentID, respondent] of Object.entries(respondents)) {
      source[respondentID] = respondent.availabilities;
    }
    return buildDateTimePeopleSet(source);
  }, [respondents]);

  const dateTimePeopleIfNeeded: DateTimePeopleSet = useMemo(() => {
    const source: Record<string, { [dateTime: string]: boolean }> = {};
    for (const [respondentID, respondent] of Object.entries(respondents)) {
      source[respondentID] = respondent.ifNeededAvailabilities;
    }
    return buildDateTimePeopleSet(source);
  }, [respondents]);

  const selMode = useAppSelector(selectSelMode);
  const hoverDateTime = useAppSelector(selectHoverDateTime);
  const dispatch = useAppDispatch();

  if (respondentIDs.length === 0) return null;

  let selectedRespondentID: number | undefined;
  if (selMode.type === 'selectedUser') {
    selectedRespondentID = selMode.selectedRespondentID;
  } else if (selMode.type === 'editingRespondent') {
    selectedRespondentID = selMode.respondentID;
  }

  const numPeopleForHover =
    hoverDateTime !== null
      ? respondentIDs.filter((respondentID) => (
          !!dateTimePeople[hoverDateTime]?.[respondentID]
          || !!dateTimePeopleIfNeeded[hoverDateTime]?.[respondentID]
        )).length
      : 0;

  return (
    <aside className="respondents-container flex-md-shrink-0 vw-respondents-card">
      <div className="vw-respondents-heading">
        Respondents ({!selectedRespondentID && hoverDateTime ? `${numPeopleForHover}/` : ''}{respondentIDs.length})
      </div>
      <ul className="vw-respondents-list">
        {respondentIDs.map(respondentID => {
          const style: Style = {};
          if (respondentID === selectedRespondentID) {
            style.color = 'var(--custom-primary)';
          }

          const availableAtHover =
            hoverDateTime !== null && !!dateTimePeople[hoverDateTime]?.[respondentID];
          const ifNeededAtHover =
            hoverDateTime !== null && !!dateTimePeopleIfNeeded[hoverDateTime]?.[respondentID];

          let className = 'vw-respondent-item';
          if (
            selectedRespondentID === undefined &&
            hoverDateTime !== null &&
            !availableAtHover &&
            !ifNeededAtHover
          ) {
            className += ' unavailable';
          }
          if (respondentID === selectedRespondentID) {
            className += ' active';
          }
          if (
            selectedRespondentID === undefined &&
            hoverDateTime !== null &&
            !availableAtHover &&
            ifNeededAtHover
          ) {
            className += ' ifneeded';
          }

          let onClick: React.MouseEventHandler | undefined;
          if (respondentID === selectedRespondentID) {
            onClick = () => dispatch(resetSelection());
          } else {
            onClick = () => dispatch(selectUser({ respondentID }));
          }

          let onMouseEnter: React.MouseEventHandler | undefined;
          let onMouseLeave: React.MouseEventHandler | undefined;
          if (selMode.type === 'none') {
            onMouseEnter = () => dispatch(setHoverUser(respondentID));
            onMouseLeave = () => dispatch(setHoverUser(null));
          }

          return (
            <li
              key={respondentID}
              className={className}
              style={style}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onClick={onClick}
            >
              <span className="vw-respondent-name">{respondents[respondentID].name}</span>
              {selectedRespondentID === undefined && hoverDateTime !== null && !availableAtHover && ifNeededAtHover && (
                <span className="vw-respondent-badge">If needed</span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default React.memo(MeetingRespondents);
