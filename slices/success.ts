"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface SuccessState {
  message: string;
}

const initialState: SuccessState = {
  message: "",
};

export const successSlice = createSlice({
  name: 'success',
  initialState,
  reducers: {
    clearSuccessMsg: state => {
      state.message = "";
    },
    setSuccessMsg: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    }
  }
})

export const { clearSuccessMsg, setSuccessMsg } = successSlice.actions

export default successSlice.reducer
