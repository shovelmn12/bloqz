import { EventTransformer } from "@bloqz/core";
import { exhaustMap } from "rxjs";

/**
 * Returns an {@link EventTransformer} that ignores new events of the same type
 * if an existing handler execution for that type is already in progress.
 *
 * This is useful for preventing duplicate actions triggered by rapid clicks
 * (e.g., form submission button) or other repeated events where only the first
 * invocation should be processed until it completes.
 *
 * Uses `exhaustMap` operator internally.
 *
 * @template Event The specific event type this transformer will apply to.
 * @returns {EventTransformer<Event>} An event transformer function implementing droppable processing.
 * @example
 * bloc.on('SUBMIT_FORM', handleSubmit, { transformer: droppable() });
 */
export function droppable<Event>(): EventTransformer<Event> {
  // exhaustMap ignores new source emissions while the current inner Observable (project result) is active.
  return (project) => exhaustMap(project);
}
