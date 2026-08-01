"use client";

import type { FormEventHandler, ReactNode } from "react";
import { Link } from "@/routerCompat";
import { Heading } from "./Heading";
// auth form panels

interface AuthPanelProps {
  title?: ReactNode;
  children?: ReactNode;
  bottomLabel?: ReactNode;
  bottomLink: string;
  // Declared for type-compatibility with call sites: the component reads its
  // second positional arg for the form handler, not this prop.
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

function AuthPanel(props: AuthPanelProps, onSubmit?: FormEventHandler<HTMLFormElement>) {
  return (
    <>
      <div className="flex items-center justify-center">
        <div className="relative grow min-w-0 bg-off-white max-w-[30rem] mt-0 sm:mt-10 h-full rounded-xl border border-brown/50">
          <div
            id="items-inside-box"
            className="flex flex-col items-center gap-4 "
          >
            <Heading className="mt-2 sm:mt-6 !text-4xl !p-2 !animate-none">
              {props.title}
            </Heading>
            <form
              className="self-stretch px-4 sm:px-12 flex flex-col gap-6"
              onSubmit={onSubmit}
            >
              {props.children}
            </form>
            <div className="py-10"/>
            <div className="absolute bottom-4 left-4 inset-x-4 py-4 flex items-center justify-center border border-brown/15 bg-brown/5 rounded-md">
              <div>
                {props.bottomLabel}
                <span className="font-bold text-primary">
                  <Link
                    to={`/${props.bottomLink
                      .toLowerCase()
                      .replace(/\s/g, "")}`}
                  >
                    {props.bottomLink}
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AuthPanelWide(props: AuthPanelProps, onSubmit?: FormEventHandler<HTMLFormElement>) {
  return (
    <>
      <div className="flex items-center justify-center">
        <div className="relative grow bg-off-white max-w-[60rem] mt-10 h-full rounded-xl border border-brown/50">
          <div
            id="items-inside-box"
            className="flex flex-col items-center gap-4 "
          >
            <Heading className="mt-2 sm:mt-6 !text-4xl !p-2 !animate-none">
              {props.title}
            </Heading>
            <form
              className="self-stretch px-12 flex flex-col gap-6"
              onSubmit={onSubmit}
            >
              {props.children}
            </form>
            <div className="py-10"/>
            <div className="absolute bottom-4 left-4 inset-x-4 py-4 flex items-center justify-center border border-brown/15 bg-brown/5 rounded-md">
              <div>
                {props.bottomLabel}
                <span className="font-bold text-primary">
                  <Link
                    to={`/${props.bottomLink
                      .toLowerCase()
                      .replace(/\s/g, "")}`}
                  >
                    {props.bottomLink}
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { AuthPanel };
export { AuthPanelWide };
