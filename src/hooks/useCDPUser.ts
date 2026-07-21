import { useIsSignedIn, useEvmAddress } from "@coinbase/cdp-hooks";

/**
 * Returns the current user's EVM wallet address if signed in via CDP,
 * or null for guests. Use this as the canonical user identifier.
 */
export function useCDPUser() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();

  return {
    isSignedIn,
    userId: isSignedIn && evmAddress ? evmAddress : null,
  };
}
