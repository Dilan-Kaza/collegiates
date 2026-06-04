import Link from "next/link";
import { Heading } from "./heading";

function AuthPanel(props, onSubmit) {
  return (
    <>
      <div className="flex items-center justify-center">
        <div className="relative grow bg-off-white max-w-[30rem] mt-10 h-full rounded-xl border border-brown/50">
          <div
            id="items-inside-box"
            className="flex flex-col items-center gap-4 "
          >
            <Heading className="mt-6 !text-4xl !p-2 !animate-none">
              {props.title}
            </Heading>
            <form
              className="self-stretch px-12 flex flex-col gap-6"
              onSubmit={onSubmit}
            >
              {props.children}
            </form>
            <div className="absolute bottom-4 left-4 inset-x-4 py-4 flex items-center justify-center border border-brown/15 bg-brown/5 rounded-md">
              <div>
                {props.bottomLabel}
                <span className="font-bold text-primary">
                  <Link
                    href={`/${props.bottomLink
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

function AuthPanelWide(props, onSubmit) {
  return (
    <>
      <div className="flex items-center justify-center">
        <div className="relative grow bg-off-white max-w-[60rem] mt-10 h-full rounded-xl border border-brown/50">
          <div
            id="items-inside-box"
            className="flex flex-col items-center gap-4 "
          >
            <Heading className="mt-6 !text-4xl !p-2 !animate-none">
              {props.title}
            </Heading>
            <form
              className="self-stretch px-12 flex flex-col gap-6"
              onSubmit={onSubmit}
            >
              {props.children}
            </form>
            <div className="absolute bottom-4 left-4 inset-x-4 py-4 flex items-center justify-center border border-brown/15 bg-brown/5 rounded-md">
              <div>
                {props.bottomLabel}
                <span className="font-bold text-primary">
                  <Link
                    href={`/${props.bottomLink
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
