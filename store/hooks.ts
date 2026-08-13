"use client";

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "@/store";

/**
 * Pre-typed `useDispatch`. Use this rather than the plain hook, so dispatched
 * actions and thunks are checked against the store.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Pre-typed `useSelector`. Use this rather than the plain hook, so selectors know
 * the state's shape without annotating it at every call site.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
