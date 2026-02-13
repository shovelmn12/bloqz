import React, { useMemo } from "react";
import { createRelay, Relay, RelayEventsMap } from "@bloqz/relay";
import { RelayContext } from "./context.js";

/**
 * The props for the `RelayProvider` component.
 *
 * @template Events The map of events supported by the Relay instance.
 */
export interface RelayProviderProps<Events extends RelayEventsMap> {
  /**
   * An optional function to create the Relay instance.
   * If not provided, a default Relay instance will be created using `createRelay`.
   */
  readonly create?: () => Relay<Events>;
}

/**
 * A provider component that makes a Relay instance available to its descendants
 * via the `useRelay` hook.
 *
 * The Relay instance is created once using the `create` factory function and
 * memoized for the lifetime of the provider (or until the `create` function changes).
 *
 * @template Events The map of events supported by the Relay instance.
 * @param props The component props.
 * @param props.children The children to be rendered within the provider.
 * @param props.create An optional factory function to create the Relay instance.
 * Defaults to `createRelay`.
 * @returns A React element that provides the Relay context.
 *
 * @example
 * ```tsx
 * import { RelayProvider } from "@bloqz/react-relay";
 *
 * function App() {
 *   return (
 *     <RelayProvider>
 *       <MyComponent />
 *     </RelayProvider>
 *   );
 * }
 * ```
 */
export function RelayProvider<Events extends RelayEventsMap>({
  children,
  create = createRelay<Events>,
}: React.PropsWithChildren<RelayProviderProps<Events>>): React.ReactElement {
  const relay = useMemo(create, [create]);

  return (
    <RelayContext.Provider value={relay}>{children}</RelayContext.Provider>
  );
}
