/**
 * The standard shape for any event payload passed through the relay.
 * It must include a `type` string to allow for pattern-based filtering.
 *
 * @example
 * const loginEvent: RelayEvent = { type: 'login', userId: '123' };
 * const logoutEvent: RelayEvent = { type: 'logout' };
 */
export type RelayEvent = {
  readonly type: string;
  readonly [key: string]: any;
};

/**
 * A handler function that receives the topic and event for a matched subscription.
 *
 * @param topic The topic the event was emitted on (e.g., 'user', 'cart').
 * @param event The event payload.
 */
export type RelayTopicHandler<T, E> = (topic: T, event: E) => void;

/**
 * A handler function that receives the event for a matched subscription.
 *
 * @param event The event payload.
 */
export type RelayHandler<E> = (event: E) => void;

/**
 * A predicate function used for advanced event filtering. It receives the full
 * event context and returns `true` if the handler should be called.
 *
 * @param topic The topic of the event.
 * @param event The event payload.
 * @returns `true` if the subscription handler should be invoked.
 */
export type RelayPredicate<T, E> = (topic: T, event: E) => boolean;

/**
 * A non-generic, RxJS-powered event bus that supports pattern-based
 * and predicate-based subscriptions. It serves as a central hub for
 * cross-cutting communication, such as between Blocs.
 */
export interface Relay<Events extends RelayEvent> {
  /**
   * Emits an event to a specific topic. All active subscriptions will be
   * evaluated against the event, and matching handlers will be invoked.
   *
   * @param topic The topic to emit to (e.g., 'user', 'cart').
   * @param event The event payload, which MUST include a `type` property
   * (e.g., `{ type: 'login', userId: '123' }`).
   */
  emit<T extends keyof Events>(topic: T, event: Events[T]): void;

  /**
   * Disposes of the relay, completing its internal event stream and
   * unsubscribing all listeners. After disposal, the relay can no longer
   * be used.
   */
  dispose(): void;

  /**
   * Registers a callback for events matching a specific topic.
   *
   * @param topic The topic to listen to.
   * @param callback The callback to execute when a matching event is emitted.
   * @returns A function to unregister the callback and unsubscribe.
   *
   * @example
   * on('user', (event) => { ... });
   * on('*', (topic, event) => { ... });
   */
  on<T extends keyof Events>(
    topic: T,
    callback: RelayHandler<Events[T]>,
  ): () => void;

  /**
   * Registers a callback for all events emitted on the relay.
   *
   * @param topic The wildcard pattern '*'.
   * @param callback The callback to execute when any event is emitted.
   * @returns A function to unregister the callback and unsubscribe.
   */
  on(topic: "*", callback: RelayTopicHandler<string, RelayEvent>): () => void;
}
