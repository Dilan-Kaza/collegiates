import { createSlice } from '@reduxjs/toolkit'

export const jwtSlice = createSlice({
  name: 'jwt',
  initialState: {
    access:""
  },
  reducers: {
    clearJwt: state => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state = {
        access:""
      }
    },
    setJwt: (state, newAccess) => {
      state.access = newAccess.payload
    }
  }
})

// Action creators are generated for each case reducer function
export const { clearJwt, setJwt } = jwtSlice.actions

export default jwtSlice.reducer