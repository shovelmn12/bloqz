import { useContext, useEffect, useLayoutEffect, useRef } from "react";
import {
  Relay,
  RelayEvent,
  RelayEventsMap,
  RelayEventsMapOf,
  RelayHandler,
  RelayTopicHandler,
} from "@bloqz/relay";

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

/**
 * Subscribes to a relay topic for the lifetime of the calling component.
 *
 * The subscription is created on mount and removed on unmount, and is renewed
 * only when `topic` (or the relay) changes. The latest `handler` is always
 * called, so it does not need to be memoized.
 *
 * @param topic The topic to listen to, or `'*'` for every event.
 * @param handler Called with the event, or with `(topic, event)` for `'*'`.
 * @throws If called outside of a `RelayProvider`.
 *
 * @example
 * ```tsx
 * useRelayEvent("*", (topic, event) => log(topic, event));
 * useRelayEvent<AppEvents, "user">("user", (event) => {
 *   // event: AppEvents["user"]
 * });
 * ```
 */
export function useRelayEvent(
  topic: "*",
  handler: RelayTopicHandler<string, RelayEvent>,
): void;
export function useRelayEvent<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
  T extends keyof Events = keyof Events,
>(topic: T, handler: T extends "*" ? never : RelayHandler<Events[T]>): void;
export function useRelayEvent(
  topic: PropertyKey,
  handler: (...args: any[]) => void,
): void {
  const relay = useRelay();
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(
    () =>
      (relay.on as (...args: any[]) => () => void)(topic, (...args: any[]) =>
        handlerRef.current(...args),
      ),
    [relay, topic],
  );
}
