import { SignUp } from "@clerk/clerk-react";
import { AuthFrame } from "../../features/auth/AuthFrame";
import { clerkAppearance } from "../../features/auth/authAppearance";

export default function SignUpPage() {
  return (
    <AuthFrame
      title="Create your account"
      subtitle="Set up your RoastMySite workspace and start generating premium AI roast reports."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </AuthFrame>
  );
}
