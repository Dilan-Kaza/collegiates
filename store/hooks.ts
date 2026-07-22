"use client";

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "@/store";

// Pre-typed Redux hooks — use these instead of the plain `useDispatch` /
// `useSelector` so selectors and dispatched thunks are strongly typed.
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
