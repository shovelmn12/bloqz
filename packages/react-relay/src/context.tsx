import { createContext } from "react";
import { Relay, createRelay } from "@bloqz/relay";

export const RelayContext = createContext<Relay>(createRelay());
