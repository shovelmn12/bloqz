import { Subject } from "rxjs";
import { filter } from "rxjs/operators";

import {
  Relay,
  RelayEvent,
  RelayHandler,
  RelayTopicHandler,
} from "./models.js";

/**
 * Factory function to create a new Relay instance using RxJS.
 * @returns A new Relay instance.
 */
export function createRelay<Events extends RelayEvent = any>(): Relay<Events> {
  // The single, central stream for all events.
  const eventStream$ = new Subject<{ topic: string; event: RelayEvent }>();

  return {
    emit<T extends keyof Events>(topic: T, event: Events[T]): void {
      // Simply push the new event into the stream.
      eventStream$.next({ topic: topic as string, event });
    },
    on<T extends keyof Events>(
      topicOrPattern: T | "*",
      callback: RelayHandler<Events[T]> | RelayTopicHandler<string, RelayEvent>,
    ): () => void {
      // Create a new subscription to the main stream.
      const subscription = eventStream$
        .pipe(
          // Filter by topic or allow all if wildcard.
          filter(
            ({ topic }) => topicOrPattern === "*" || topic === topicOrPattern,
          ),
        )
        .subscribe(({ topic, event }) => {
          // When an event passes the filter, call the user's handler.
          if (topicOrPattern === "*") {
            (callback as RelayTopicHandler<string, RelayEvent>)(topic, event);
          } else {
            (callback as RelayHandler<Events[T]>)(event as Events[T]);
          }
        });

      // Return a function that tears down this specific subscription.
      return () => subscription.unsubscribe();
    },
    dispose(): void {
      // Complete the subject, which automatically unsubscribes all listeners.
      eventStream$.complete();
    },
  };
}
