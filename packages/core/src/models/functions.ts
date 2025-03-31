import { ObservableInput, OperatorFunction } from "@/utils/stream";
import { BlocContext } from "@/models";

// --- Event Type Helpers ---

/**
 * Extracts a union of all string literal types used in the `type` property
 * across all members of the `Event` union type.
 * Useful for constraining string identifiers passed to `bloc.on`.
 *
 * @template Event The event union type (e.g., `CounterEvent`).
 * @example
 * type MyEvent = { type: 'A'; data: string } | { type: 'B'; value: number };
 * type MyEventTypes = EventTypeOf<MyEvent>; // Results in: 'A' | 'B'
 */
export type EventTypeOf<Event> = Event extends { type: infer T extends string }
  ? T
  : never;

/**
 * Selects and extracts the specific event type from a union `Event`
 * that matches a given string literal `TType` for its `type` property.
 * Useful for typing the `event` parameter within an `EventHandler` when using
 * string literal identifiers with `bloc.on`.
 *
 * @template Event The event union type (e.g., `CounterEvent`).
 * @template TType The specific string literal type of the `type` property to match (e.g., `'INCREMENT'`).
 * @example
 * type MyEvent = { type: 'A'; data: string } | { type: 'B'; value: number };
 * type EventA = ExtractEventByType<MyEvent, 'A'>; // Results in: { type: 'A'; data: string }
 */
export type ExtractEventByType<Event, TType extends string> = Event extends {
  type: TType;
}
  ? Event
  : never;

// --- Event Handling & Transformation Types ---

/**
 * Defines the signature for a function that transforms a stream of specific events,
 * typically used to implement concurrency control strategies (like sequential,
 * restartable, concurrent, droppable).
 *
 * It receives a `project` function which encapsulates the execution of the
 * core `EventHandler` logic (including state updates and potential async operations)
 * and must return an RxJS `OperatorFunction` (e.g., one created using `concatMap`,
 * `switchMap`, `mergeMap`, `exhaustMap`) that applies the desired concurrency
 * behavior to the stream of incoming events of this specific type.
 *
 * @template Event The specific type of event this transformer will operate on.
 */
export type EventTransformer<Event> = (
  /**
   * A function that maps an incoming event to an Observable representing the
   * execution of the associated `EventHandler`. This Observable should handle
   * the handler's logic (sync or async) and signal completion or error.
   * @param event The specific event instance being processed.
   * @returns An ObservableInput (like an Observable, Promise, or sync value)
   *          representing the handler's execution sequence.
   */
  project: (event: Event) => ObservableInput<unknown>
) => OperatorFunction<Event, unknown>; // The resulting RxJS operator to apply

/**
 * Defines the signature for the function that executes application logic
 * in response to a specific event. It receives the event payload and the
 * Bloc context (for accessing state and dispatching updates).
 *
 * Handlers can be synchronous (`void`) or asynchronous (`Promise<void>`).
 *
 * @template Event The specific type of the event payload this handler processes.
 * @template State The type of the state managed by the Bloc.
 */
export type EventHandlerFunction<Event, State> = (
  /** The specific event object that triggered this handler. */
  event: Event,
  /** The context providing state access and update capabilities. */
  context: BlocContext<State>
) => void | Promise<void>; // Can be sync or async

/**
 * Defines the structure for providing an event handler and optionally its transformer.
 * Used when more configuration than just the handler function is needed.
 *
 * @template Event The specific type of the event payload this definition handles.
 * @template State The state type for the Bloc.
 */
export interface EventHandlerObject<Event, State> {
  /** The function to execute when the corresponding event occurs. */
  handler: EventHandlerFunction<Event, State>;
  /**
   * Optional: Specifies the concurrency behavior for this specific handler.
   * If omitted, the default transformer (concurrent) will be used.
   */
  transformer?: EventTransformer<Event>;
}

/**
 * Represents the possible inputs for a handler configuration in the `handlers` object.
 * It can be either the EventHandler function directly, or an object containing
 * the handler and optional transformer options.
 *
 * @template Event The specific type of the event payload this configuration handles.
 * @template State The state type for the Bloc.
 */
export type EventHandler<Event, State> =
  | EventHandlerFunction<Event, State> // Direct handler function
  | EventHandlerObject<Event, State>; // Object with handler/options

/**
 * A type that represents the mechanism used to identify and register handlers
 * for specific event types within the `bloc.on` method. It supports two forms:
 *
 * 1.  **String Literal Type:** If the event union (`BaseEvent`) uses discriminated unions
 *     with a `type` property, you can provide the string literal corresponding to
 *     the desired event's `type` (e.g., `'INCREMENT'`).
 * 2.  **Type Predicate Function:** A function that takes an event from the base union
 *     and returns `true` if it matches the specific `Event` subtype, acting as a
 *     type guard (`(event: BaseEvent) => event is Event`).
 *
 * @template BaseEvent The overall event union type for the Bloc (e.g., `CounterEvent`).
 * @template Event The specific subtype of `BaseEvent` that the identifier targets
 *                 (e.g., `IncrementEvent` or `LegacyStatusEvent`).
 */
export type EventTypeIdentifier<BaseEvent, Event extends BaseEvent> =
  // Extracts the string literal type if Event has a `type` property
  | (Event extends { type: infer Type extends string } ? Type : never)
  // Allows a type predicate function
  | ((event: BaseEvent) => event is Event);

/**
 * Defines the signature for a callback function that can be provided to `createBloc`
 * to globally handle errors that occur *within* any registered `EventHandler`.
 * This is useful for centralized error logging or reporting.
 *
 * Note: This handles errors *from* event handlers, not errors in the event stream
 * pipeline itself (which are caught separately).
 *
 * @template Event The event union type for the Bloc.
 */
export type ErrorHandler<Event> = (
  /** The error that was thrown or rejected within the EventHandler. */
  error: unknown,
  /** The specific event instance that was being processed when the error occurred. */
  event: Event
) => void;
