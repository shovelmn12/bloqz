import { createContext } from "react";
import { Relay } from "@bloqz/relay";

/**
 * The React context that holds the Relay event bus instance.
 *
 * The context value defaults to a no-op Relay instance to avoid null checks
 * when the hook is used without a provider.
 *
 * @internal This context is intended for internal use by the `RelayProvider` 
 * and `useRelay` hook. Direct consumption is discouraged.
 */
export const RelayContext = createContext<Relay<any>>({
  emit: () => {},
  on: () => () => {},
  dispose: () => {},
});
