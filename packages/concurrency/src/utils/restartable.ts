import { EventTransformer } from "@bloc/core";
import { switchMap } from "rxjs";

/**
 * Returns an {@link EventTransformer} that processes only the latest event,
 * cancelling any ongoing handler execution for previous events of the same type.
 *
 * This is useful for scenarios like search-as-you-type, where only the result
 * for the latest input matters, or for actions triggered rapidly where intermediate
 * states or effects are irrelevant.
 *
 * Uses `switchMap` operator internally.
 *
 * @template Event The specific event type this transformer will apply to.
 * @returns {EventTransformer<Event>} An event transformer function implementing restartable processing.
 * @example
 * bloc.on('SEARCH_QUERY_CHANGED', handleSearch, { transformer: restartable() });
 */
export function restartable<Event>(): EventTransformer<Event> {
  // switchMap subscribes to the new inner Observable (project result) and unsubscribes from the previous one.
  return (project) => switchMap(project);
}
