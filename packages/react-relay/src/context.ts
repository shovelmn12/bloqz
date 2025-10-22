import { createContext } from 'react';
import { Relay, EventsMap, createRelay } from '@bloqz/relay';

/**
 * The context for the Relay event bus.
 */
export const RelayContext = createContext<Relay<EventsMap>>(createRelay());
