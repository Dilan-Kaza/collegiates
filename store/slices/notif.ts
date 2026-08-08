"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// One notification at a time; `isError` picks the <Notif /> variant.
// setSuccessMsg/setErrorMsg keep their old names so call sites are unchanged.
interface NotifState {
  message: string;
  isError: boolean;
}

const initialState: NotifState = {
  message: "",
  isError: false,
};

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

export const { clearNotif, setSuccessMsg, setErrorMsg } = notifSlice.actions;

export default notifSlice.reducer;
