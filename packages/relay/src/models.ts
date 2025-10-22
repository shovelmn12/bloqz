/**
 * The standard shape for any event payload passed through the relay.
 * It must include a `type` string to allow for pattern-based filtering.
 *
 * @example
 * const loginEvent: RelayEvent = { type: 'login', userId: '123' };
 * const logoutEvent: RelayEvent = { type: 'logout' };
 */
export type RelayEvent = { readonly type: string };

/**
 * A handler function that receives the topic and event for a matched subscription.
 *
 * @param topic The topic the event was emitted on (e.g., 'user', 'cart').
 * @param event The event payload.
 */
export type RelayHandler = (topic: string, event: RelayEvent) => void;

/**
 * A predicate function used for advanced event filtering. It receives the full
 * event context and returns `true` if the handler should be called.
 *
 * @param topic The topic of the event.
 * @param event The event payload.
 * @returns `true` if the subscription handler should be invoked.
 */
export type RelayPredicate = (topic: string, event: RelayEvent) => boolean;

/**
 * A non-generic, RxJS-powered event bus that supports pattern-based
 * and predicate-based subscriptions. It serves as a central hub for
 * cross-cutting communication, such as between Blocs.
 */
export interface Relay {
  /**
   * Emits an event to a specific topic. All active subscriptions will be
   * evaluated against the event, and matching handlers will be invoked.
   *
   * @param topic The topic to emit to (e.g., 'user', 'cart').
   * @param event The event payload, which MUST include a `type` property
   * (e.g., `{ type: 'login', userId: '123' }`).
   */
  emit(topic: string, event: RelayEvent): void;

  /**
   * Disposes of the relay, completing its internal event stream and
   * unsubscribing all listeners. After disposal, the relay can no longer
   * be used.
   */
  dispose(): void;

  /**
   * Registers a callback for events matching a specific string pattern.
   * The pattern allows for filtering by topic and event type.
   *
   * @param pattern A string pattern to match against topics and event types.
   *   - `*`: Wildcard, matches any topic and event.
   *   - `topic.*`: Matches any event on a specific topic.
   *   - `*.{type1|type2}`: Matches specific event types on any topic.
   *   - `topic.{type1|type2}`: Matches specific event types on a specific topic.
   *   - `topic1|topic2`: Matches any event on a list of topics.
   * @param callback The callback to execute when a matching event is emitted.
   * @returns A function to unregister the callback and unsubscribe.
   *
   * @example
   * on('user.{login|logout}', (topic, event) => { ... });
   * on('cart', (topic, event) => { ... }); // same as cart.*
   * on('*', (topic, event) => { ... });
   */
  on(pattern: string, callback: RelayHandler): () => void;

  /**
   * Registers a callback for events that pass a custom predicate function.
   * This allows for more complex filtering logic than string patterns.
   *
   * @param predicate A function that returns `true` for events to listen to.
   * @param callback The callback to execute for events that pass the predicate.
   * @returns A function to unregister the callback and unsubscribe.
   *
   * @example
   * on((topic, event) => topic === 'user' && event.type === 'login', callback);
   */
  on(predicate: RelayPredicate, callback: RelayHandler): () => void;
}
