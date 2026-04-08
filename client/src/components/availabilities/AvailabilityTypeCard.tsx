import React from 'react';
import NonFocusButton from 'components/NonFocusButton';
import { useAppDispatch, useAppSelector } from 'app/hooks';
import {
  selectSelectionKind,
  setSelectionKind,
} from 'slices/availabilitiesSelection';

export default function AvailabilityTypeCard() {
  const dispatch = useAppDispatch();
  const selectionKind = useAppSelector(selectSelectionKind);

  return (
    <div className="meeting-mode-card meeting-mode-card-compact vw-right-availability-card">
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
        >
          Available
        </NonFocusButton>
        <NonFocusButton
          className={`meeting-mode-pill meeting-mode-pill-ifneeded ${
            selectionKind === 'ifNeeded' ? 'is-active' : ''
          }`}
          onClick={() => dispatch(setSelectionKind('ifNeeded'))}
        >
          If needed
        </NonFocusButton>
      </div>
    </div>
  );
}
