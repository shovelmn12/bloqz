import { Subject } from "rxjs";
import { filter } from "rxjs/operators";

import { Relay, RelayEvent, RelayHandler, RelayPredicate } from "./index.js";

/**
 * Factory function to create a new Relay instance using RxJS.
 * @returns A new Relay instance.
 */
export function createRelay(): Relay {
  // The single, central stream for all events.
  const eventStream$ = new Subject<{ topic: string; event: RelayEvent }>();

  /**
   * Parses a pattern and checks if it matches a given topic and event.
   * (This helper function remains the same)
   */
  const matchesPattern = (
    pattern: string,
    topic: string,
    event: RelayEvent
  ): boolean => {
    if (pattern === "*") return true;
    const subPatterns = pattern.split("|");
    return subPatterns.some((subPattern) => {
      const [topicPattern, typePattern] = subPattern.split(".");
      if (topicPattern !== "*" && topicPattern !== topic) return false;
      if (!typePattern) return true;
      if (typePattern.startsWith("{") && typePattern.endsWith("}")) {
        const types = typePattern.slice(1, -1).split("|");
        return types.includes(event.type);
      }
      return typePattern === event.type;
    });
  };

  return {
    emit(topic: string, event: RelayEvent): void {
      // Simply push the new event into the stream.
      eventStream$.next({ topic, event });
    },
    on(
      patternOrPredicate: string | RelayPredicate,
      callback: RelayHandler
    ): () => void {
      // Create the filter predicate once, before subscribing.
      const filterFn = ({
        topic,
        event,
      }: {
        topic: string;
        event: RelayEvent;
      }): boolean => {
        if (typeof patternOrPredicate === "string") {
          return matchesPattern(patternOrPredicate, topic, event);
        }
        // For predicates, just execute them.
        return patternOrPredicate(topic, event);
      };

      // Create a new subscription to the main stream.
      const subscription = eventStream$
        .pipe(
          // Use the pre-built filter function. This is more efficient.
          filter(filterFn)
        )
        .subscribe(({ topic, event }) => {
          // When an event passes the filter, call the user's handler.
          callback(topic, event);
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
