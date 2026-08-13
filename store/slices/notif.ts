"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * The app's toast notification, rendered by `<Notif />`.
 *
 * @remarks
 * Exactly one notification at a time — a new message replaces whatever was
 * showing rather than queueing behind it. `isError` picks the variant.
 *
 * @packageDocumentation
 */
interface NotifState {
  message: string;
  isError: boolean;
}

const initialState: NotifState = {
  message: "",
  isError: false,
};

/** The notification slice. Prefer the exported actions over touching this. */
export const notifSlice = createSlice({
  name: "notif",
  initialState,
  reducers: {
    clearNotif: (state) => {
      state.message = "";
      state.isError = false;
    },
    setSuccessMsg: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
      state.isError = false;
    },
    setErrorMsg: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
      state.isError = true;
    },
  },
});

/**
 * Dismisses the notification ({@link clearNotif}), or shows a success
 * ({@link setSuccessMsg}) or failure ({@link setErrorMsg}) toast.
 */
export const { clearNotif, setSuccessMsg, setErrorMsg } = notifSlice.actions;

export default notifSlice.reducer;
