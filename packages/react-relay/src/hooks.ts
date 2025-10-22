import { useContext } from 'react';
import { Relay, EventsMap } from '@bloqz/relay';
import { RelayContext } from './context';

/**
 * A hook to get the Relay event bus instance.
 * @returns The Relay instance.
 */
export function useRelay(): Relay<EventsMap> {
  return useContext(RelayContext);
}
