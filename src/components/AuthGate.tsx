import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useIsSignedIn, useEvmAddress } from "@coinbase/cdp-hooks";

/**
 * Shows a wallet connect prompt for guests.
 * When signed in, renders children instead.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useIsSignedIn();
  if (isSignedIn) return <>{children}</>;

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-5xl">🔐</div>
        <h2 className="text-2xl font-bold neon-text">Sign in to participate</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Connect your wallet to place bets, confirm outages, and earn Civic Points on Base.
        </p>
      </div>
      <AuthButton />
      <p className="text-xs text-muted-foreground/60">
        No seed phrases. Sign in with email, SMS, or social.
      </p>
    </div>
  );
}

/**
 * Small inline sign-in button for use in headers / nav.
 */
export function AuthButtonSmall() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();

  if (isSignedIn && evmAddress) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-mono">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        {evmAddress.slice(0, 6)}…{evmAddress.slice(-4)}
      </div>
    );
  }

  return <AuthButton />;
}
