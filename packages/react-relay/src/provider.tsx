import React, { useEffect, useRef, useState } from "react";
import {
  createRelay,
  Relay,
  RelayEventsMap,
  RelayEventsMapOf,
} from "@bloqz/relay";
import { RelayContext } from "./context.js";

/**
 * The props for the `RelayProvider` component.
 *
 * @template Events The map of events supported by the Relay instance.
 */
export interface RelayProviderProps<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
> {
  /**
   * An optional function to create the Relay instance. It is called once per
   * provider mount, so passing an inline function is fine.
   * If not provided, a default Relay instance is created using `createRelay`.
   *
   * The provider owns the returned relay and disposes it on unmount.
   */
  readonly create?: () => Relay<Events>;
}

/**
 * A provider component that makes a Relay instance available to its descendants
 * via the `useRelay` hook.
 *
 * The Relay instance is created once per mount using the `create` factory
 * (later changes to `create` are ignored) and disposed when the provider
 * unmounts.
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
export function RelayProvider<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
>({
  children,
  create = createRelay<Events>,
}: React.PropsWithChildren<RelayProviderProps<Events>>): React.ReactElement {
  // Lazy initializer: `create` runs once per mount, even if it is inline.
  const [relay, setRelay] = useState(create);

  const createRef = useRef(create);
  const pendingDisposeRef = useRef<Relay<Events> | null>(null);

  useEffect(() => {
    createRef.current = create;
  });

  useEffect(() => {
    // A cleanup immediately followed by a setup (StrictMode's dev-only
    // double-invoke) cancels the scheduled disposal, so descendants never see
    // the relay disposed while the provider is still mounted.
    if (pendingDisposeRef.current === relay) {
      pendingDisposeRef.current = null;
    }

    // The relay was disposed while the provider stayed mounted (e.g. it was
    // hidden and shown again): replace it with a fresh one.
    if (relay.isDisposed) {
      setRelay(() => createRef.current());
      return;
    }

    return () => {
      pendingDisposeRef.current = relay;

      queueMicrotask(() => {
        if (pendingDisposeRef.current === relay) {
          pendingDisposeRef.current = null;
          relay.dispose();
        }
      });
    };
  }, [relay]);

  return (
    <RelayContext.Provider value={relay}>{children}</RelayContext.Provider>
  );
}
