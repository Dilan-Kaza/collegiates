"use client";

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface BlogCategoryState {
  category: string | null;
}

const initialState: BlogCategoryState = {
  category: null,
};

export const blogCategorySlice = createSlice({
  name: 'blogCategory',
  initialState,
  reducers: {
    setBlogCategory: (state, action: PayloadAction<string | null>) => {
      state.category = action.payload;
    },
    clearBlogCategory: state => {
      state.category = null;
    },
  }
})

export const { setBlogCategory, clearBlogCategory } = blogCategorySlice.actions

export default blogCategorySlice.reducer
