"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// Global full-screen loading flag. A single boolean drives the <LoadingOverlay />
// mounted in the root layout, so any client component can show the app-wide
// loading screen by dispatching setLoading(true) and clearing it with
// setLoading(false) (typically in a .finally()).
interface LoadingState {
  loading: boolean;
}

const initialState: LoadingState = {
  loading: false,
};

export const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  }
})

export const { setLoading } = loadingSlice.actions

export default loadingSlice.reducer
