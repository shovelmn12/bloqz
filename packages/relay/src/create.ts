import { Subject } from "rxjs";
import { filter } from "rxjs/operators";

import {
  Relay,
  RelayErrorContext,
  RelayEvent,
  RelayEventsMap,
  RelayEventsMapOf,
  RelayOptions,
} from "./models.js";

type Envelope = { topic: string; event: RelayEvent };

function defaultOnError(error: unknown, { topic, event }: RelayErrorContext) {
  console.error(
    `Relay: Error in subscriber for topic "${topic}":`,
    error,
    "Event:",
    event,
  );
}

/**
 * Factory function to create a new Relay instance using RxJS.
 *
 * Subscriber errors are isolated: a throwing subscriber never prevents other
 * subscribers from receiving the event and never makes `emit` throw. Errors are
 * reported to `options.onError`, or to `console.error` if none is given.
 *
 * @param options Optional relay options.
 * @returns A new Relay instance.
 */
export function createRelay<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
>(options: RelayOptions = {}): Relay<Events> {
  const onError = options.onError ?? defaultOnError;

  // The single, central stream for all events.
  const eventStream$ = new Subject<Envelope>();

  const reportError = (error: unknown, context: RelayErrorContext) => {
    try {
      onError(error, context);
    } catch (onErrorFailure) {
      // Never let error reporting break delivery or escape `emit`.
      defaultOnError(onErrorFailure, context);
    }
  };

  const on = (
    topicOrPattern: PropertyKey,
    callback: (...args: any[]) => void,
  ): (() => void) => {
    const isWildcard = topicOrPattern === "*";

    const subscription = eventStream$
      .pipe(filter(({ topic }) => isWildcard || topic === topicOrPattern))
      .subscribe(({ topic, event }) => {
        try {
          if (isWildcard) {
            callback(topic, event);
          } else {
            callback(event);
          }
        } catch (error) {
          reportError(error, { topic, event });
        }
      });

    return () => subscription.unsubscribe();
  };

  return {
    emit(topic, event): void {
      eventStream$.next({ topic: topic as string, event });
    },
    on: on as Relay<Events>["on"],
    dispose(): void {
      // Complete the subject, which automatically unsubscribes all listeners.
      eventStream$.complete();
    },
  };
}
