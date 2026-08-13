"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * The global loading flag behind the root layout's `<LoadingOverlay />`.
 *
 * @remarks
 * Any client component can dispatch `setLoading(true)` before a slow operation.
 * Clear it in a `.finally()` — an early return or a thrown error would otherwise
 * leave the overlay covering the page.
 *
 * @packageDocumentation
 */
interface LoadingState {
  loading: boolean;
}

const initialState: LoadingState = {
  loading: false,
};

/** The loading slice. Prefer the {@link setLoading} action over touching this. */
export const loadingSlice = createSlice({
  name: "loading",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

/** Shows or hides the global loading overlay. */
export const { setLoading } = loadingSlice.actions;

export default loadingSlice.reducer;
