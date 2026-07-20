"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface ErrorState {
  message: string;
}

const initialState: ErrorState = {
  message: "",
};

export const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    clearErrorMsg: state => {
      state.message = "";
    },
    setErrorMsg: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    }
  }
})

export const { clearErrorMsg, setErrorMsg } = errorSlice.actions

export default errorSlice.reducer
