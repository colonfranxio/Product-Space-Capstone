import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export default function SignupPage() {
  return (
    <>
      <div className="font-bold text-[22px] tracking-[-.01em]">SponsorStory</div>
      <Suspense><AuthForm mode="signup" /></Suspense>
    </>
  );
}
