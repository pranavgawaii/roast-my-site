import { SignIn } from "@clerk/clerk-react";
import { AuthFrame } from "../../features/auth/AuthFrame";
import { clerkAppearance } from "../../features/auth/authAppearance";

export default function SignInPage() {
  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to continue roasting websites from your private RoastMySite workspace."
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </AuthFrame>
  );
}
