"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// Global loading flag driving the root layout's <LoadingOverlay />. Any client
// component can dispatch setLoading(true), clearing it in a .finally().
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
