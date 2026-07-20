"use client";
// Compatibility shims so the ported react-router call sites keep working on
// top of the Next.js App Router (next/navigation).
import NextLink from "next/link";
import { useRouter, usePathname, useParams as useNextParams } from "next/navigation";
import type { ComponentProps } from "react";

interface NavigateOptions {
  replace?: boolean;
}

type NavigateFn = (to: string | number, opts?: NavigateOptions) => void;

// react-router's useNavigate() returns a function: nav("/path") or nav(-1).
export function useNavigate(): NavigateFn {
  const router = useRouter();
  return (to, opts) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    if (opts?.replace) router.replace(to);
    else router.push(to);
  };
}

// react-router's useLocation() -> { pathname, ... }
export function useLocation(): { pathname: string } {
  const pathname = usePathname();
  return { pathname };
}

// next/navigation's useParams has the same shape ({ [key]: value }).
export const useParams = useNextParams;

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string };

// react-router's <Link to="/x"> -> next/link's <Link href="/x">
export function Link({ to, replace, ...props }: LinkProps) {
  return <NextLink href={to} replace={replace} {...props} />;
}
