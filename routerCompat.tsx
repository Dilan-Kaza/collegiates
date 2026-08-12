"use client";
// Compatibility shims so the ported react-router call sites keep working on
// top of the Next.js App Router (next/navigation).
import NextLink from "next/link";
import { usePathname, useParams as useNextParams } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useNavigateContext } from "@components/NavigationProvider";

// react-router's useNavigate(): nav("/path") or nav(-1). Backed by NavigationProvider, which
// runs the navigation in a transition and shows the global loading overlay.
export function useNavigate() {
  return useNavigateContext();
}

// react-router's useLocation() -> { pathname, ... }
export function useLocation(): { pathname: string } {
  const pathname = usePathname();
  return { pathname };
}

// next/navigation's useParams has the same shape ({ [key]: value }).
export const useParams = useNextParams;

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string };

// react-router's <Link to="/x"> -> next/link's <Link href="/x">. Left-clicks route through
// NavigationProvider's transition; modifier/middle clicks and target="_blank" fall through.
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
