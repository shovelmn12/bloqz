/**
 * A map of event topics to their corresponding event payloads.
 *
 * This is the default (untyped) event map. Typed relays do not need to extend
 * it: any object type or interface whose values are {@link RelayEvent}s is
 * accepted (see {@link RelayEventsMapOf}).
 */
export type RelayEventsMap = {
  readonly [topic: string]: RelayEvent;
};

/**
 * The constraint used for a relay's event map: every property of `Events` must
 * be a {@link RelayEvent}. Unlike {@link RelayEventsMap}, this does not require
 * an index signature, so plain interfaces are accepted.
 *
 * @example
 * interface AppEvents {
 *   user: { type: 'login'; userId: string } | { type: 'logout' };
 * }
 * const relay = createRelay<AppEvents>();
 */
export type RelayEventsMapOf<Events> = {
  readonly [K in keyof Events]: RelayEvent;
};

/**
 * The standard shape for any event payload passed through the relay.
 * It must include a `type` string.
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
 * A predicate function over a topic and event.
 *
 * @deprecated Not used by any relay API: the relay has no predicate-based
 * subscriptions. Filter inside an `on('*', ...)` handler instead. This type
 * will be removed in the next major version.
 */
export type RelayPredicate<T, E> = (topic: T, event: E) => boolean;

/**
 * Context passed to {@link RelayOptions.onError} describing the emission during
 * which a subscriber threw.
 */
export interface RelayErrorContext {
  /** The topic the event was emitted on. */
  readonly topic: string;
  /** The event payload that was being delivered. */
  readonly event: RelayEvent;
}

/**
 * Options for {@link createRelay}.
 */
export interface RelayOptions {
  /**
   * Called when a subscriber throws while handling an event. Errors never
   * propagate out of `emit` and never stop delivery to other subscribers.
   * Defaults to logging via `console.error`.
   */
  readonly onError?: (error: unknown, context: RelayErrorContext) => void;
}

/**
 * An RxJS-powered event bus with topic-based subscriptions and a `'*'`
 * wildcard subscription. It serves as a central hub for cross-cutting
 * communication, such as between Blocs.
 *
 * Events are delivered synchronously, in subscription order.
 */
export interface Relay<
  Events extends RelayEventsMapOf<Events> = RelayEventsMap,
> {
  /**
   * Emits an event to a specific topic. Every listener on that topic, and every
   * `'*'` listener, is invoked synchronously.
   *
   * After {@link Relay.dispose}, this logs a warning and does nothing.
   *
   * @param topic The topic to emit to (e.g., 'user', 'cart').
   * @param event The event payload, which MUST include a `type` property
   * (e.g., `{ type: 'login', userId: '123' }`).
   */
  emit<T extends keyof Events>(topic: T, event: Events[T]): void;

  /**
   * Disposes of the relay, unsubscribing all listeners. After disposal,
   * `emit` and `on` log a warning and do nothing. Calling `dispose` more than
   * once is safe.
   */
  dispose(): void;

  /**
   * Whether {@link Relay.dispose} has been called.
   */
  readonly isDisposed: boolean;

  /**
   * Registers a callback for all events emitted on the relay.
   *
   * @param topic The wildcard pattern '*'.
   * @param callback The callback to execute with `(topic, event)` when any
   * event is emitted.
   * @returns A function to unregister the callback.
   */
  on(topic: "*", callback: RelayTopicHandler<string, RelayEvent>): () => void;

  /**
   * Registers a callback for events on a specific topic.
   *
   * After {@link Relay.dispose}, this logs a warning, registers nothing and
   * returns a no-op function.
   *
   * @param topic The topic to listen to.
   * @param callback The callback to execute with the event when one is emitted
   * on `topic`.
   * @returns A function to unregister the callback.
   *
   * @example
   * on('user', (event) => { ... });
   * on('*', (topic, event) => { ... });
   */
  on<T extends keyof Events>(
    topic: T,
    callback: T extends "*" ? never : RelayHandler<Events[T]>,
  ): () => void;
}
