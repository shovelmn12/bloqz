import { useContext } from "react";
import { Relay, RelayEventsMap, RelayEventsMapOf } from "@bloqz/relay";

import { RelayContext } from "./context.js";

/**
 * A hook to get the Relay event bus instance from the context.
 *
 * @template Events The map of events supported by the Relay instance.
 * @returns The Relay instance.
 * @throws If called outside of a `RelayProvider`.
 * @example
 * ```tsx
 * import { useRelay } from "@bloqz/react-relay";
 *
 * function MyComponent() {
 *   const relay = useRelay<AppEvents>();
 *
 *   // ...
 * }
 * ```
 */
export function useRelay<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
>(): Relay<Events> {
  const relay = useContext(RelayContext);

  if (relay === null) {
    throw new Error("useRelay must be used within a RelayProvider");
  }

  return relay;
}
