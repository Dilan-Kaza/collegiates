"use client";

import { configureStore } from '@reduxjs/toolkit'
import successReducer from '@slices/success'
import errorReducer from '@slices/error'
import blogCategoryReducer from '@slices/blogCategory'


const store = configureStore({
    reducer: {
      success: successReducer,
      error: errorReducer,
      blogCategory: blogCategoryReducer,
    }
})

// Inferred root state and dispatch types — consumed by the typed hooks in
// hooks.ts and by thunks in the slices.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
