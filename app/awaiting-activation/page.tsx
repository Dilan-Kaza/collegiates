"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPanel, MtHeader } from "@components";
import { resendActivation } from "@functions/actions";

function AwaitingActivation() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const handleResend = async () => {
    if (!email) return;
    setResendState("sending");
    await resendActivation({ email });
    setResendState("sent");
  };

  return (
    <>
      <div className="hidden sm:block"><MtHeader/></div>
      <AuthPanel
        bottomLink="Sign In"
        bottomLabel="Already activated? "
        title="Confirm Your Email"
      >
        <div className="text-center text-gray-600">
          {email ? (
            <>We sent an activation link to <span className="font-bold">{email}</span>. Click it to activate your account before signing in.</>
          ) : (
            <>We sent an activation link to your email. Click it to activate your account before signing in.</>
          )}
        </div>
        {resendState === "sent" ? (
          <div className="text-center text-primary font-medium">
            If an account with that email exists, a new activation link was sent.
          </div>
        ) : email && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendState === "sending"}
              className="btn btn-primary"
            >
              {resendState === "sending" ? "Sending..." : "Resend activation email"}
            </button>
          </div>
        )}
      </AuthPanel>
    </>
  );
}

export default function AwaitingActivationPage() {
  return (
    <Suspense fallback={null}>
      <AwaitingActivation />
    </Suspense>
  );
}
