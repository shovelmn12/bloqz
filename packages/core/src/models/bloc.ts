import { Observable, EMPTY as EMPTY_STREAM } from "../utils/stream.js";

/**
 * The public interface for a Bloc instance created by `createBloc`.
 * This version assumes event handlers are defined upfront during creation
 * (e.g., via a `handlers` object or map) and does not include an `on` method
 * for registering handlers after instantiation.
 *
 * It provides access to the current state, a stream of state changes,
 * a method to dispatch events, a stream for errors, and a cleanup method.
 *
 * @template Event The base union type for all possible events this Bloc can process.
 *                 Events typically use a discriminated union pattern (with a `type` string property).
 * @template State The type representing the state managed by this Bloc.
 */
export interface Bloc<Event, State> {
  readonly id: string;

  /**
   * An Observable stream that emits the Bloc's state whenever it changes.
   * Subscribers receive the latest state immediately upon subscription and
   * subsequent updates as they occur. Uses `shareReplay(1)` internally
   * for efficiency and replaying the last state to new subscribers.
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
   * This value is updated whenever the `state$` stream emits.
   *
   * @example
   * const count = counterBloc.state.count;
   * console.log('Current count:', count);
   */
  readonly state: State;

  /**
   * An Observable stream that emits error objects when an exception occurs
   * *within* an event handler during event processing.
   * This allows for centralized observation or logging of handler-specific errors.
   *
   * It emits an object containing the original `event` that caused the error
   * and the `error` itself. Stream errors (pipeline errors) are also emitted here,
   * often with `event` being `undefined`.
   *
   * @example
   * const errorSubscription = myBloc.errors$.subscribe(({ event, error }) => {
   *   console.error('Error processing event:', event, 'Error:', error);
   *   // Report error to a tracking service
   * });
   */
  readonly errors$: Observable<{ event: Event; error: unknown }>;

  /**
   * Dispatches an event to the Bloc for processing.
   * The Bloc will find the corresponding registered handler (defined during creation)
   * based on the event's type and execute it according to the specified
   * concurrency strategy (transformer).
   *
   * @param {Event} event The event object to dispatch. It must be a member of the Bloc's `Event` union type.
   * @example
   * bloc.add({ type: 'INCREMENT', amount: 2 });
   */
  readonly add: (event: Event) => void;

  /**
   * Cleans up all resources used by the Bloc instance.
   * This includes unsubscribing from the internal event processing pipeline,
   * completing the state and error observables, and clearing internal handler references.
   *
   * **Crucial to call this when the Bloc is no longer needed** (e.g., in a
   * component's unmount lifecycle) to prevent memory leaks and ensure graceful shutdown.
   * After `close` is called, the Bloc should no longer be used (e.g., calling `add` or accessing `state` might warn or be ineffective).
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

  readonly isClosed: boolean;
}

/**
 * A constant `Bloc` instance that serves as a "no-op" or null object.
 * It provides empty streams and dummy methods that do nothing.
 * This is useful for initializing variables to a safe, non-null value
 * or as a placeholder when a Bloc is not yet available, preventing
 * runtime errors.
 */
export const EMPTY = {
  id: "EMPTY",
  state$: EMPTY_STREAM,
  state: {},
  errors$: EMPTY_STREAM,
  add: () => {},
  close: () => {},
  isClosed: false,
};
