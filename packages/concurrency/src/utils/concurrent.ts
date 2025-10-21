import { EventTransformer } from "@bloqz/core";
import { mergeMap } from "rxjs";

/**
 * Returns an {@link EventTransformer} that processes events concurrently.
 *
 * Multiple event handler executions for the same event type can run in parallel.
 * Use this when handlers are independent and processing them simultaneously is safe
 * and potentially improves throughput. Be cautious about race conditions if handlers
 * affect shared state.
 *
 * Uses `mergeMap` operator internally.
 *
 * @template Event The specific event type this transformer will apply to.
 * @returns {EventTransformer<Event>} An event transformer function implementing concurrent processing.
 * @example
 * // If handleLogToServer can run multiple times in parallel safely
 * bloc.on('LOG_EVENT', handleLogToServer, { transformer: concurrent() });
 */
export function concurrent<Event>(): EventTransformer<Event> {
  // mergeMap subscribes to all inner Observables (project results) immediately, allowing parallel execution.
  return (project) => mergeMap(project);
}
