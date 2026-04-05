import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store';

export type DateSelectionMode = 'specific' | 'dow';

const initialState = 'specific' as DateSelectionMode;

const dateSelectionModeSlice = createSlice({
  name: 'dateSelectionMode',
  initialState: initialState as DateSelectionMode,
  reducers: {
    setDateSelectionMode: (_state, action: PayloadAction<DateSelectionMode>) => action.payload,
    resetDateSelectionMode: () => initialState,
  },
});

export const { setDateSelectionMode, resetDateSelectionMode } = dateSelectionModeSlice.actions;
export const selectDateSelectionMode = (state: RootState) => state.dateSelectionMode;

export default dateSelectionModeSlice.reducer;
