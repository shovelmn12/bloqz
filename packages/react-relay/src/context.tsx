import { createContext } from "react";
import { Relay } from "@bloqz/relay";

/**
 * The React context that holds the Relay event bus instance.
 *
 * It defaults to `null`; `useRelay` throws when no `RelayProvider` is present.
 *
 * @internal This context is intended for internal use by the `RelayProvider`
 * and `useRelay` hook. Direct consumption is discouraged.
 */
export const RelayContext = createContext<Relay<any> | null>(null);
