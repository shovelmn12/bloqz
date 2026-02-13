import { useContext } from "react";
import { Relay, RelayEventsMap } from "@bloqz/relay";

import { RelayContext } from "./context.js";

/**
 * A hook to get the Relay event bus instance from the context.
 *
 * @template Events The map of events supported by the Relay instance.
 * @returns The Relay instance.
 * @example
 * ```tsx
 * import { useRelay } from "@bloqz/react-relay";
 *
 * function MyComponent() {
 *   const relay = useRelay();
 *
 *   // ...
 * }
 * ```
 */
export function useRelay<Events extends RelayEventsMap>(): Relay<Events> {
  return useContext(RelayContext);
}
