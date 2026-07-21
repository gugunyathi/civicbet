import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { CDPReactProvider } from "@coinbase/cdp-react";
import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";

const CDP_PROJECT_ID = import.meta.env.VITE_CDP_PROJECT_ID ?? "";

function NotFoundComponent() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="text-center">
        <div className="font-display text-6xl font-bold neon-text">404</div>
        <p className="mt-2 text-sm text-muted-foreground">This market doesn't exist.</p>
        <a href="/" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head home.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
          <a href="/" className="rounded-full border border-white/15 px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/** Inner component that can access CDP hooks (must be inside CDPReactProvider) */
function AuthenticatedStoreProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const userId = isSignedIn && evmAddress ? evmAddress : null;

  return <StoreProvider userId={userId}>{children}</StoreProvider>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <CDPReactProvider
      config={{
        projectId: CDP_PROJECT_ID,
        ethereum: {
          createOnLogin: "smart", // Base smart account on sign-in
        },
        appName: "CivicBet",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthenticatedStoreProvider>
          <AppShell />
        </AuthenticatedStoreProvider>
      </QueryClientProvider>
    </CDPReactProvider>
  );
}
