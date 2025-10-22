import { createContext } from "react";
import { Relay, createRelay } from "@bloqz/relay";

/**
 * The context for the Relay event bus.
 *
 * @internal This context is not intended for direct use.
 * Instead, use the `RelayProvider` to provide the Relay instance
 * and the `useRelay` hook to access it.
 */
export const RelayContext = createContext<Relay>(createRelay());
