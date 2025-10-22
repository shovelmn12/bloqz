import React, { useMemo } from "react";
import { createRelay, Relay } from "@bloqz/relay";
import { RelayContext } from "./context.js";

/**
 * The props for the `RelayProvider` component.
 */
export interface RelayProviderProps {
  /**
   * An optional function to create the Relay instance.
   * If not provided, a default Relay instance will be created.
   */
  readonly create?: () => Relay;
}

/**
 * A provider for the Relay event bus.
 *
 * @param props The props for the component.
 * @param props.children The children to render.
 * @param props.create An optional function to create the Relay instance.
 * @returns The Relay provider.
 */
export function RelayProvider({
  children,
  create = createRelay,
}: React.PropsWithChildren<RelayProviderProps>): React.ReactElement {
  const relay = useMemo(create, [create]);

  return (
    <RelayContext.Provider value={relay}>{children}</RelayContext.Provider>
  );
}
