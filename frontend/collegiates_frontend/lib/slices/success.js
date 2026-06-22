import { createSlice } from '@reduxjs/toolkit'

export const successSlice = createSlice({
  name: 'success',
  initialState: {
    message:""
  },
  reducers: {
    clearSuccessMsg: state => {
      state.message = "";
    },
    setSuccessMsg: (state, message) => {
      state.message = message.payload;
    }
  }
})

// Action creators are generated for each case reducer function
export const { clearSuccessMsg, setSuccessMsg } = successSlice.actions

export default successSlice.reducer