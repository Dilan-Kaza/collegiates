"use client";

/**
 * react-router shims over the Next.js App Router.
 *
 * @remarks
 * The app was ported from a react-router SPA. Rather than rewrite every call
 * site, these keep `useNavigate`, `useLocation`, `useParams`, and
 * `<Link to="…">` working on top of `next/navigation`.
 *
 * They are not bare re-exports: navigation routes through
 * {@link "components/NavigationProvider"}, so every route change runs in a
 * transition and raises the global loading overlay.
 *
 * @packageDocumentation
 */
import NextLink from "next/link";
import { usePathname, useParams as useNextParams } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useNavigateContext } from "@components/NavigationProvider";

/**
 * react-router's `useNavigate()`.
 *
 * @returns `nav("/path")` to push, `nav("/path", { replace: true })` to replace,
 * or `nav(-1)` to go back.
 */
export function useNavigate() {
  return useNavigateContext();
}

/** react-router's `useLocation()`, narrowed to the `pathname` the call sites read. */
export function useLocation(): { pathname: string } {
  const pathname = usePathname();
  return { pathname };
}

/** react-router's `useParams()`. Re-exported as-is — the shapes already match. */
export const useParams = useNextParams;

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string };

/**
 * react-router's `<Link to="/x">`, over `next/link`.
 *
 * @remarks
 * A plain left-click is intercepted and routed through
 * {@link "components/NavigationProvider"}, so it runs in a transition with the
 * loading overlay. Everything else falls through to the browser: modifier
 * clicks, middle clicks, and `target="_blank"` all behave normally.
 *
 * It renders a real `<a href>` either way, which is what lets Next prefetch the
 * destination and keeps open-in-new-tab working.
 */
export function Link({ to, replace, onClick, ...props }: LinkProps) {
  const navigate = useNavigateContext();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (props.target && props.target !== "_self") return;
    e.preventDefault();
    navigate(to, { replace });
  };

  return <NextLink href={to} replace={replace} onClick={handleClick} {...props} />;
}
