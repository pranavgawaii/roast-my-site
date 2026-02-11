import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const clerkPublishableKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
const isProd = import.meta.env.PROD;

function ConfigurationError() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Configuration Error</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Clerk key is missing</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          Set <code className="rounded bg-zinc-800 px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
          in your Vercel project environment variables, then redeploy.
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          This guard prevents blank-screen failures when auth configuration is incomplete.
        </p>
      </div>
    </div>
  );
}

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        afterSignOutUrl="/"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      >
        {app}
      </ClerkProvider>
    ) : (
      isProd ? <ConfigurationError /> : app
    )}
  </React.StrictMode>
);
