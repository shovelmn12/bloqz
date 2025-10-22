/**
 * A generic record of events, where keys are topic names and values are the event payloads.
 */
export type EventsMap = Record<string, any>;

/**
 * Defines a type-safe Topic-Event interface.
 *
 * @template T The topic, which must be a key of the `Events` type.
 */
export interface TopicEvent<
  Events extends EventsMap,
  T extends keyof Events = keyof Events
> {
  readonly topic: T;
  readonly event: Events[T];
}

/**
 * A handler for a specific event topic.
 * @template T The event payload.
 * @param event The event to handle.
 */
export type Handler<T = unknown> = (event: T) => void;

/**
 * A handler for a wildcard event subscription.
 * @template Events The map of all possible events.
 * @param topic The topic of the event.
 * @param event The event to handle.
 */
export type WildcardHandler<Events extends EventsMap> = (
  topic: keyof Events,
  event: Events[keyof Events]
) => void;

/**
 * An event bus, renamed to Relay.
 * @template Events The map of all possible events.
 */
export interface Relay<Events extends EventsMap> {
  /**
   * Emits an event to a specific topic.
   * @template T The topic of the event.
   * @param topic The topic to emit to.
   * @param event The event payload.
   */
  emit<T extends keyof Events>(topic: T, event: Events[T]): void;

  /**
   * Disposes the relay, completing all underlying subjects.
   */
  dispose(): void;

  /**
   * Registers a callback for a specific event topic.
   * @template T The topic of the event.
   * @param topic The topic to subscribe to.
   * @param callback The callback to execute when the event is emitted.
   * @returns A function to unregister the callback.
   */
  on<T extends keyof Events>(
    topic: T,
    callback: Handler<Events[T]>
  ): () => void;

  /**
   * Registers a callback for all events.
   * @param topic The wildcard topic '*'.
   * @param callback The callback to execute for any event.
   * @returns A function to unregister the callback.
   */
  on(topic: '*', callback: WildcardHandler<Events>): () => void;
}
