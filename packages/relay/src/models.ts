/**
 * The standard shape for any event payload.
 * It must include a 'type' string.
 */
export type RelayEvent = { readonly type: string };

/**
 * A handler that receives the full event context.
 */
export type RelayHandler = (topic: string, event: RelayEvent) => void;

/**
 * A predicate function used to filter events.
 * It receives the full event context and returns true if the
 * handler should be called.
 */
export type RelayPredicate = (topic: string, event: RelayEvent) => boolean;

/**
 * A non-generic event bus with pattern and predicate subscriptions.
 */
export interface Relay {
  /**
   * Emits an event to a specific topic.
   *
   * @param topic The topic to emit to (e.g., 'user', 'cart').
   * @param event The event payload, which MUST include a 'type'
   * (e.g., { type: 'login', id: 123 }).
   */
  emit(topic: string, event: RelayEvent): void;

  /**
   * Disposes the relay and unsubscribes all listeners.
   */
  dispose(): void;

  /**
   * Registers a callback for events matching a specific string pattern.
   *
   * @param pattern A string pattern to match against topics and event types
   * (e.g., "user.{login|logout}|cart").
   * @param callback The callback to execute.
   * @returns A function to unregister the callback.
   */
  on(pattern: string, callback: RelayHandler): () => void;

  /**
   * Registers a callback for events that pass a predicate function.
   *
   * @param predicate A function that returns true for events to listen to.
   * @param callback The callback to execute.
   * @returns A function to unregister the callback.
   */
  on(predicate: RelayPredicate, callback: RelayHandler): () => void;
}
