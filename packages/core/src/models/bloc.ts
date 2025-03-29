import { Observable } from "@/utils/stream";
import {
  EventTypeOf,
  EventTransformer,
  EventHandler,
  ExtractEventByType,
} from "@/models";

/**
 * Configuration options that can be provided when registering an event handler
 * using the `bloc.on` method.
 *
 * @template Event The specific type of event this options object applies to.
 */
export interface OnEventOptions<Event> {
  /**
   * Specifies the concurrency behavior for processing events of this type.
   * It accepts an `EventTransformer` function, which typically uses RxJS operators
   * (like `concatMap`, `mergeMap`, `switchMap`, `exhaustMap`) to control how
   * simultaneous or rapidly incoming events are handled.
   *
   * If omitted, the default concurrency behavior (usually sequential processing
   * provided by `sequential()`) is used.
   *
   * @see {@link EventTransformer}
   * @see {@link sequential}
   * @see {@link concurrent}
   * @see {@link restartable}
   * @see {@link droppable}
   *
   * @example
   * import { restartable } from './transformers'; // Assuming transformer helpers exist
   * bloc.on('FETCH_USER', handleFetchUser, { transformer: restartable() });
   */
  transformer?: EventTransformer<Event>;
}

/**
 * The public interface for a Bloc instance created by `createBloc`.
 * It provides access to the current state, a stream of state changes,
 * methods to dispatch events and register handlers, and a stream for errors.
 *
 * @template Event The base union type for all possible events this Bloc can process.
 *                 Events typically use a discriminated union pattern (with a `type` string property).
 * @template State The type representing the state managed by this Bloc.
 */
export interface Bloc<Event extends { type?: string } | object, State> {
  /**
   * An Observable stream that emits the Bloc's state whenever it changes.
   * Subscribers receive the latest state immediately upon subscription and
   * subsequent updates as they occur. Uses `shareReplay(1)` internally.
   *
   * @example
   * const subscription = myBloc.state$.subscribe(currentState => {
   *   console.log('State changed:', currentState);
   * });
   */
  readonly state$: Observable<State>;

  /**
   * Provides synchronous access to the current state value of the Bloc.
   * Useful for immediately reading the state outside of reactive streams.
   *
   * @example
   * const count = counterBloc.state.count;
   * console.log('Current count:', count);
   */
  readonly state: State;

  /**
   * An Observable stream that emits error objects when an exception occurs
   * *within* an event handler (`EventHandler`) during event processing.
   * This allows for centralized observation or logging of handler-specific errors.
   *
   * It emits an object containing the original `event` that caused the error
   * and the `error` itself.
   *
   * @example
   * const errorSubscription = myBloc.errors$.subscribe(({ event, error }) => {
   *   console.error('Error processing event:', event, 'Error:', error);
   *   // Report error to a tracking service
   * });
   */
  readonly errors$: Observable<{ event: Event; error: unknown }>; // Uses Event union

  /**
   * Registers an event handler for a specific event type identified by its
   * `type` string literal. This overload is used for events defined within
   * a discriminated union.
   *
   * @template TType The specific string literal type corresponding to the 'type' property of the event to handle.
   * @param {TType} eventTypeIdentifier The string literal identifying the event type (e.g., `'INCREMENT'`).
   * @param {EventHandler<ExtractEventByType<Event, TType>, State>} handler The function to execute when an event of the specified type occurs. The `event` parameter within the handler will be correctly typed to the specific event subtype.
   * @param {OnEventOptions<ExtractEventByType<Event, TType>>} [options] Optional configuration, primarily for setting the event transformer (concurrency strategy).
   * @returns {Bloc<Event, State>} The Bloc instance, allowing for method chaining.
   * @example
   * bloc.on('USER_LOGIN', (event, { update }) => {
   *   // event is typed as UserLoginEvent
   *   update({ status: 'authenticating', userId: event.userId });
   * });
   */
  on<TType extends EventTypeOf<Event>>( // Uses Event union
    eventTypeIdentifier: TType,
    handler: EventHandler<ExtractEventByType<Event, TType>, State>, // Narrows based on TType
    options?: OnEventOptions<ExtractEventByType<Event, TType>> // Narrows based on TType
  ): Bloc<Event, State>; // Returns the main Bloc type

  /**
   * Registers an event handler for a specific event type identified by a
   * type predicate function (a function that returns `event is SpecificEvent`).
   * This is useful for events that don't fit the discriminated union pattern
   * or require more complex matching logic.
   *
   * @template SpecificEvent The specific event subtype this handler will process, narrowed by the type predicate.
   * @param {(event: Event) => event is SpecificEvent} eventTypeIdentifier A type predicate function that identifies the target event type.
   * @param {EventHandler<SpecificEvent, State>} handler The function to execute when an event matching the predicate occurs. The `event` parameter will be correctly typed as `SpecificEvent`.
   * @param {OnEventOptions<SpecificEvent>} [options] Optional configuration, primarily for setting the event transformer (concurrency strategy).
   * @returns {Bloc<Event, State>} The Bloc instance, allowing for method chaining.
   * @example
   * function isLegacyEvent(event: MyEvent): event is LegacyEvent {
   *   return typeof (event as any).legacyId === 'string';
   * }
   *
   * bloc.on(isLegacyEvent, (event, { update }) => {
   *   // event is typed as LegacyEvent
   *   console.log('Handling legacy event:', event.legacyId);
   * });
   */
  on<SpecificEvent extends Event>( // Constrained by Event union
    eventTypeIdentifier: (event: Event) => event is SpecificEvent, // Predicate uses Event union, guards SpecificEvent
    handler: EventHandler<SpecificEvent, State>, // Uses SpecificEvent
    options?: OnEventOptions<SpecificEvent> // Uses SpecificEvent
  ): Bloc<Event, State>; // Returns the main Bloc type

  /**
   * Dispatches an event to the Bloc for processing.
   * The Bloc will find the corresponding registered handler (if any) based on the
   * event's type or matching predicate and execute it according to the specified
   * concurrency strategy (transformer).
   *
   * @param {Event} event The event object to dispatch. It must be a member of the Bloc's `Event` union type.
   * @example
   * bloc.add({ type: 'INCREMENT', amount: 2 });
   * bloc.add(new CustomEventObject()); // If CustomEventObject is part of the Event union
   */
  readonly add: (event: Event) => void; // Uses Event union

  /**
   * Cleans up all resources used by the Bloc instance.
   * This includes unsubscribing from the internal event stream, completing
   * the state and error observables, and clearing handler registrations.
   *
   * **Crucial to call this when the Bloc is no longer needed** (e.g., in a
   * component's unmount lifecycle) to prevent memory leaks.
   *
   * @example
   * useEffect(() => {
   *   const bloc = createBloc(...);
   *   // ... setup subscriptions ...
   *   return () => {
   *     bloc.close(); // Clean up on unmount
   *   };
   * }, []);
   */
  readonly close: () => void;
}
