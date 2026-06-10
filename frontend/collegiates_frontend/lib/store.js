import { configureStore } from '@reduxjs/toolkit'
import jwtReducer from './slices/jwt'


export const makeStore = () => {
  return configureStore({
    reducer: {
      jwt: jwtReducer
    }
  })
}