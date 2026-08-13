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

/**
 * Runs programmatic navigation inside a React transition, mirroring its pending
 * state into the global loading flag.
 *
 * @remarks
 * Every route change through `routerCompat`'s `Link` and `useNavigate` goes
 * through here, which is what raises the loading overlay while the next page's
 * server data resolves.
 *
 * It sits at the root and never unmounts, so a navigation's start and its settle
 * are always both observed — an unmounting provider would leave the overlay up.
 */
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

/**
 * The navigate function, for `routerCompat`'s `useNavigate` and `Link`.
 *
 * @returns `nav("/path")` to push, `nav("/path", { replace: true })` to replace,
 * or `nav(-1)` to go back.
 * @throws When called outside a {@link NavigationProvider}.
 */
export function useNavigateContext(): NavigateFn {
  const ctx = useContext(NavigateContext);
  if (!ctx) throw new Error("useNavigate() must be used within a NavigationProvider");
  return ctx;
}
