import { configureStore } from '@reduxjs/toolkit'
import jwtReducer from './slices/jwt'
import successReducer from './slices/success'
import errorReducer from './slices/error'


export const makeStore = () => {
  return configureStore({
    reducer: {
      jwt: jwtReducer,
      success: successReducer,
      error: errorReducer
    }
  })
}