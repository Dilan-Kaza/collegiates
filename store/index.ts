"use client";

import { configureStore } from "@reduxjs/toolkit";
import notifReducer from "./slices/notif";
import loadingReducer from "./slices/loading";

/**
 * The Redux store, holding **transient UI state only**.
 *
 * @remarks
 * Two slices: the toast notification and the global loading flag. Everything
 * else — server data, the session, cached reads — lives in the `sessionStorage`
 * cache and the session context, not here.
 *
 * One shared instance, mounted once by `app/providers.tsx`.
 */
const store = configureStore({
  reducer: {
    notif: notifReducer,
    loading: loadingReducer,
  },
});

/** The store's inferred state shape. Consumed by the typed hooks in `store/hooks`. */
export type RootState = ReturnType<typeof store.getState>;

/** The store's inferred dispatch type. Consumed by the typed hooks in `store/hooks`. */
export type AppDispatch = typeof store.dispatch;

export default store;
