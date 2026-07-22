"use client";

import { createContext, useContext, useCallback, useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setLoading } from "@slices";

interface NavigateOptions {
  replace?: boolean;
}

type NavigateFn = (to: string | number, opts?: NavigateOptions) => void;

const NavigateContext = createContext<NavigateFn | null>(null);

// Wraps every programmatic navigation (router.push/replace/back) in a React
// transition, and mirrors that transition's pending state into the global
// `loading` flag. Because App Router keeps a navigation transition pending until
// the destination's Server Component (with its server-fetched data) arrives, the
// app-wide <LoadingOverlay /> stays up for exactly as long as we're waiting on
// the server for the next page.
//
// This provider sits above the whole page tree and never unmounts, so both the
// start (pending → true) and settle (pending → false) updates always fire, even
// when the component that triggered the navigation unmounts mid-transition.
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dispatch(setLoading(isPending));
  }, [isPending, dispatch]);

  const navigate = useCallback<NavigateFn>(
    (to, opts) => {
      startTransition(() => {
        if (typeof to === "number") {
          if (to < 0) router.back();
          else router.forward();
          return;
        }
        if (opts?.replace) router.replace(to);
        else router.push(to);
      });
    },
    [router]
  );

  return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>;
}

export function useNavigateContext(): NavigateFn {
  const ctx = useContext(NavigateContext);
  if (!ctx) throw new Error("useNavigate() must be used within a NavigationProvider");
  return ctx;
}
