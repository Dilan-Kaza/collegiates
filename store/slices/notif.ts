"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// Single notification slice replacing the separate success/error slices. One
// message is shown at a time; `isError` selects which variant the <Notif />
// component renders. setSuccessMsg/setErrorMsg keep their old names so existing
// dispatch call sites are unchanged.
interface NotifState {
  message: string;
  isError: boolean;
}

const initialState: NotifState = {
  message: "",
  isError: false,
};

export const notifSlice = createSlice({
  name: 'notif',
  initialState,
  reducers: {
    clearNotif: state => {
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
    }
  }
})

export const { clearNotif, setSuccessMsg, setErrorMsg } = notifSlice.actions

export default notifSlice.reducer
