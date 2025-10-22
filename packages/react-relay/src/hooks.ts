import { useContext } from "react";
import { Relay } from "@bloqz/relay";

import { RelayContext } from "./context.js";

/**
 * A hook to get the Relay event bus instance.
 * @returns The Relay instance.
 */
export function useRelay(): Relay {
  return useContext(RelayContext);
}
