import { EventTransformer } from "@bloqz/core";
import { concatMap } from "rxjs";

/**
 * Returns an {@link EventTransformer} that processes events sequentially.
 *
 * Each event handler execution must complete before the next event of the same type
 * begins processing. This ensures order and prevents race conditions for handlers
 * modifying the same state aspects. This is often the default behavior if no
 * transformer is specified.
 *
 * Uses `concatMap` operator internally.
 *
 * @template Event The specific event type this transformer will apply to.
 * @returns {EventTransformer<Event>} An event transformer function implementing sequential processing.
 * @example
 * bloc.on('SAVE_DATA', handleSave, { transformer: sequential() }); // Or often just bloc.on('SAVE_DATA', handleSave);
 */
export function sequential<Event>(): EventTransformer<Event> {
  // The project function wraps the EventHandler execution.
  // concatMap ensures only one project Observable is active at a time per source group.
  return (project) => concatMap(project);
}
