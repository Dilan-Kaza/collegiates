"use client";

import { configureStore } from "@reduxjs/toolkit";
import notifReducer from "./slices/notif";
import loadingReducer from "./slices/loading";

const store = configureStore({
  reducer: {
    notif: notifReducer,
    loading: loadingReducer,
  },
});

// Inferred root state and dispatch types — consumed by the typed hooks in
// store/hooks.ts and by thunks in the slices.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
