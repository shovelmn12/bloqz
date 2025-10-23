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
   */
  const matchesPattern = (
    pattern: string,
    topic: string,
    event: RelayEvent
  ): boolean => {
    if (pattern === "*") return true;

    // Helper to split by '|' but ignore it inside '{}'
    const splitSubPatterns = (p: string): string[] => {
      // --- FIXED CODE ---
      // This regex finds all sequences of characters that are either:
      // 1. A character that isn't '|' or '{'   ([^{|])
      // 2. OR a complete '{...}' block           (\{[^}]+\})
      // The '+' repeats this, and the global 'g' flag finds all
      // such sequences, effectively splitting by '|' outside of braces.
      const regex = /(?:[^{|]|\{[^}]+\})+/g;

      // p.match() returns an array of all matches, or null if no match.
      // We return `|| []` to handle the null case (e.g., an empty pattern string),
      // which allows the .some() loop below to work correctly (it returns false).
      return p.match(regex) || [];
      // --- END FIXED CODE ---
    };

    const subPatterns = splitSubPatterns(pattern);

    // The rest of the original logic remains the same
    return subPatterns.some((subPattern) => {
      const [topicPattern, typePattern] = subPattern.split(".");
      
      // 1. Check Topic
      // If topicPattern is not wildcard and doesn't match, this sub-pattern fails
      if (topicPattern !== "*" && topicPattern !== topic) {
        return false;
      }
      
      // 2. Check Event Type
      // If no type pattern is provided (e.g., "topic3"), it's a match
      if (!typePattern) {
        return true;
      }
      
      // If event pattern is a wildcard, it's a match
      if (typePattern === "*") {
        return true;
      }
      
      // If event pattern is a set like {event1|event2}
      if (typePattern.startsWith("{") && typePattern.endsWith("}")) {
        // Extract types from "{event1|event2}" -> ["event1", "event2"]
        const types = typePattern.slice(1, -1).split("|");
        return types.includes(event.type);
      }
      
      // Otherwise, it's a direct string comparison
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
