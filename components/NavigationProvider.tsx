"use client";

import { createContext, useContext, useCallback, useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setLoading } from "@slices";

interface NavigateOptions {
  replace?: boolean;
}

type NavigateFn = (to: string | number, opts?: NavigateOptions) => void;

const NavigateContext = createContext<NavigateFn | null>(null);

// Wraps programmatic navigation in a transition, mirroring its pending state into
// the global `loading` flag. Never unmounts, so start and settle always both fire.
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
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
