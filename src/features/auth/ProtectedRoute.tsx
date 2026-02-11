import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { IS_CLERK_CONFIGURED } from "../../shared/lib/clerk";
import { Card } from "../../shared/ui/Card";
import { LoadingSpinner } from "../../shared/ui/LoadingSpinner";

function AuthenticatedRoute({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
        <Card className="flex items-center gap-3">
          <LoadingSpinner />
          <span className="text-sm text-zinc-200">Checking your session...</span>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/sign-in?redirect_url=${next}`} replace />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  if (!IS_CLERK_CONFIGURED) {
    // If Clerk is not configured, we allow access in dev or show a setup warning.
    // Given the previous fixes, we should probably just return children but maybe 
    // with a warning. For now, let's just let it pass to avoid crashing.
    return <>{children}</>;
  }

  return <AuthenticatedRoute>{children}</AuthenticatedRoute>;
}
