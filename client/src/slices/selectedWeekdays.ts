import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';

export type SelectedWeekdaysState = {
  days: Record<number, true>;
};

const initialState: SelectedWeekdaysState = {
  days: {},
};

const selectedWeekdaysSlice = createSlice({
  name: 'selectedWeekdays',
  initialState,
  reducers: {
    addWeekday: (state, action: PayloadAction<number>) => {
      state.days[action.payload] = true;
    },
    removeWeekday: (state, action: PayloadAction<number>) => {
      delete state.days[action.payload];
    },
    setSelectedWeekdays: (state, action: PayloadAction<Record<number, true>>) => {
      state.days = action.payload;
    },
    resetSelectedWeekdays: () => initialState,
  },
});

export const {
  addWeekday,
  removeWeekday,
  setSelectedWeekdays,
  resetSelectedWeekdays,
} = selectedWeekdaysSlice.actions;

export const selectSelectedWeekdays = (state: RootState) => state.selectedWeekdays.days;

export default selectedWeekdaysSlice.reducer;
