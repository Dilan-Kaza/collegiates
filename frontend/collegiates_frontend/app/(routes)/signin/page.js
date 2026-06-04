import { AuthPanel } from "@/app/components/authPanel";
import { Button } from "@/app/components/button";
import { ShortAnswer } from "@/app/components/formComponents";

export default function SignIn() {
  return (
    <>
      <div
        id="bg-component"
        className="bg-secondary h-screen w-full skew-y-6 absolute -top-[50svh] left-0 -z-20"
      ></div>
      <AuthPanel
        bottomLink="Register"
        bottomLabel="Don't have an account? "
        title="Sign In"
      >
        <ShortAnswer
          type="email"
          name="email"
          label="Email*"
          required
        />
        <ShortAnswer
          type="password"
          name="password1"
          label="Password*"
        />
        <div className="flex">
          <div className="flex-col flex-1"></div>
          <div className="flex-box">
            <Button 
              className="self-stretch mb-20">
              Log In
            </Button>
          </div>
        </div>
        &nbsp;
        <div className="flex">
          <div>&nbsp;</div>
        </div>
      </AuthPanel>
    </>
  );
}
