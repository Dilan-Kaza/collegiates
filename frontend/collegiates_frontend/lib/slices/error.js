import { createSlice } from '@reduxjs/toolkit'

export const errorSlice = createSlice({
  name: 'error',
  initialState: {
    message:""
  },
  reducers: {
    clearErrorMsg: state => {
      state.message = "";
    },
    setErrorMsg: (state, message) => {
      state.message = message.payload;
    }
  }
})

// Action creators are generated for each case reducer function
export const { clearErrorMsg, setErrorMsg } = errorSlice.actions

export default errorSlice.reducer