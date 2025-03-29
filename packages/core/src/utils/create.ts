import {
  Observable,
  Subject,
  BehaviorSubject,
  map,
  mergeMap,
  groupBy,
  tap,
  shareReplay,
  EMPTY,
  catchError,
  finalize,
  from,
} from "@/utils/stream";
import {
  BlocContext,
  EventTransformer,
  EventHandler,
  EventTypeIdentifier,
  BlocErrorHandler,
  OnEventOptions,
  Bloc,
} from "@/models";

// --- Internal Default Transformer ---

/**
 * Provides the default event transformer if none is specified in `OnEventOptions`.
 * The default behavior is concurrent processing using `mergeMap`.
 * @internal
 * @template Event The specific event type.
 * @returns {EventTransformer<Event>} An event transformer implementing concurrent processing.
 */
function defaultTransformer<Event>(): EventTransformer<Event> {
  // mergeMap subscribes to all inner Observables (project results) immediately, allowing parallel execution.
  return (project) => mergeMap(project);
}

// --- Internal Types ---

/**
 * Internal configuration stored for each registered event handler.
 * This holds the logic needed to match and execute a handler for an event.
 *
 * @template Event The event union type for the Bloc.
 * @template State The state type for the Bloc.
 * @internal
 */
interface HandlerConfig<Event, State> {
  /**
   * The predicate function used to determine if an incoming event
   * matches the type this handler is registered for.
   * Derived from the `eventTypeIdentifier` provided to `on`.
   */
  predicate: (event: Event) => boolean;
  /**
   * The actual event handler function provided by the user.
   * Uses `any` internally for the event payload type as the public `on`
   * overloads ensure type safety for the caller.
   */
  handler: EventHandler<any, State>;
  /**
   * The original identifier (string literal or predicate function)
   * used when registering the handler via `on`. Stored for potential
   * debugging or future features like handler removal.
   */
  eventTypeIdentifier: EventTypeIdentifier<Event, any>;
  /**
   * The event transformer function (e.g., from `sequential()`, `restartable()`)
   * that dictates the concurrency behavior for processing events handled by this configuration.
   * Uses `any` internally for the event type as the public `on` overloads
   * ensure type safety for the caller.
   */
  transformer: EventTransformer<any>;
}

// --- Factory Function (`createBloc`) ---

/**
 * Creates a new Bloc instance for managing state based on events.
 * It sets up the internal state management, event processing pipeline,
 * and provides the public API for interacting with the Bloc.
 *
 * @export
 * @template Event The base union type for all possible events this Bloc can process.
 *                 Events typically use a discriminated union pattern (with a `type` string property)
 *                 or can be identified via type predicates.
 * @template State The type representing the state managed by this Bloc.
 * @param {State} initialState The initial state of the Bloc.
 * @param {BlocErrorHandler<Event>} [onError] Optional callback function invoked globally
 *                                            whenever an error occurs *within* any registered
 *                                            event handler during its execution. Useful for
 *                                            centralized error logging or reporting.
 * @returns {Bloc<Event, State>} A Bloc instance adhering to the public API.
 */
export function createBloc<Event extends { type?: string } | object, State>(
  initialState: State,
  onError?: BlocErrorHandler<Event>
): Bloc<Event, State> {
  // Return type uses Event

  // --- Private State & Subjects (managed by closure) ---

  /** @internal Manages the current state and emits state changes. */
  const _stateSubject = new BehaviorSubject<State>(initialState);
  /** @internal Subject for receiving incoming events dispatched via `add`. */
  const _eventSubject = new Subject<Event>();
  /** @internal Subject for emitting errors that occur within event handlers. */
  const _errorSubject = new Subject<{ event: Event; error: unknown }>();
  /** @internal Registry mapping event identifiers to their handler configurations. */
  const _handlerRegistry = new Map<
    EventTypeIdentifier<Event, any>,
    HandlerConfig<Event, State>
  >();
  /** @internal Optional global error handler callback provided by the user. */
  const _onErrorCallback: BlocErrorHandler<Event> | undefined = onError;
  /** @internal Flag indicating if the Bloc has been closed. */
  let _isClosed = false;

  // --- State Update Function (uses State) ---

  /**
   * Internal function to update the Bloc's state.
   * Emits the new state on the _stateSubject if it differs from the current state.
   * @internal
   * @param newValueOrFn The new state value or a function to compute it based on the current state.
   */
  const updateState = (
    newValueOrFn: State | ((currentState: State) => State)
  ): void => {
    if (_isClosed) {
      // Avoid state updates after the Bloc is closed.
      console.warn("Bloc: Attempted to update state after closed.");
      return;
    }
    // Get the absolute current state before calculating the next state.
    const currentState = _stateSubject.getValue();
    const nextState =
      typeof newValueOrFn === "function"
        ? (newValueOrFn as (currentState: State) => State)(currentState)
        : newValueOrFn;
    // Only emit if the state has actually changed.
    if (nextState !== currentState) {
      _stateSubject.next(nextState);
    }
  };

  // --- Handler Registration (`on` method implementation) ---

  /**
   * Internal implementation of the `on` method. Registers the handler configuration.
   * Relies on public overloads for external type safety.
   * @internal
   */
  const on = (
    eventTypeIdentifier: EventTypeIdentifier<Event, any>, // Uses Event
    handler: EventHandler<any, State>,
    options: OnEventOptions<any> = {}
  ): Bloc<Event, State> => {
    if (_isClosed) {
      console.warn("Bloc: Attempted to register handler after closed.");
      return bloc; // Return the already defined instance
    }

    // Warn if a handler for the same identifier is being overwritten.
    if (_handlerRegistry.has(eventTypeIdentifier)) {
      console.warn(
        `Bloc: Handler for event type identified by "${String(
          eventTypeIdentifier
        )}" already registered. Overwriting.`
      );
    }

    // Determine the transformer, defaulting to concurrent processing via defaultTransformer().
    // ** JSDoc for OnEventOptions should reflect this default if defined elsewhere **
    const transformer = options.transformer ?? defaultTransformer();
    let predicate: (event: Event) => boolean; // Predicate function to match events

    // Create the predicate based on the identifier type.
    if (typeof eventTypeIdentifier === "string") {
      // Match based on the 'type' property for discriminated unions.
      predicate = (event: Event): event is any =>
        (event as any)?.type === eventTypeIdentifier; // Uses Event
    } else if (typeof eventTypeIdentifier === "function") {
      // Use the provided type predicate function directly.
      predicate = eventTypeIdentifier as (event: Event) => boolean; // Uses Event
    } else {
      // Invalid identifier type provided.
      console.error(
        "Bloc: Invalid eventTypeIdentifier provided to 'on'. Must be a string literal or a type predicate function."
      );
      return bloc; // Return the instance without registering
    }

    // Store the handler configuration in the registry.
    _handlerRegistry.set(eventTypeIdentifier, {
      predicate,
      handler,
      eventTypeIdentifier,
      transformer,
    });

    // Return the Bloc instance for chaining.
    return bloc;
  };

  // --- Event Dispatch (`add` method) ---

  /**
   * Internal implementation of the `add` method. Pushes events onto the event subject.
   * @internal
   */
  const add = (event: Event): void => {
    if (_isClosed) {
      console.warn("Bloc: Attempted to add event after closed.");
      return;
    }
    // Push the event into the processing pipeline.
    _eventSubject.next(event);
  };

  // --- State Getter ---

  /**
   * Internal function to retrieve the current state synchronously.
   * @internal
   */
  const getState = (): State => _stateSubject.getValue();

  // --- Core Event Processing Logic ---

  /**
   * The main RxJS subscription that processes events from the _eventSubject.
   * This pipeline finds the appropriate handler, applies the concurrency transformer,
   * executes the handler, and manages errors.
   * It starts immediately upon Bloc creation.
   * @internal
   */
  const _subscription = _eventSubject
    .pipe(
      // Step 1: Find the matching handler configuration for the incoming event.
      map((event): [Event, HandlerConfig<Event, State> | undefined] => {
        for (const config of _handlerRegistry.values()) {
          if (config.predicate(event)) {
            // Found a matching handler.
            return [event, config];
          }
        }
        // No handler found for this event.
        return [event, undefined];
      }),

      // Step 2: Group events based on the identifier of their matched handler.
      // This ensures concurrency strategies (transformers) apply correctly per event type.
      // Unhandled events are grouped under a special key.
      groupBy(
        ([event, config]) =>
          config?.eventTypeIdentifier ?? " S Y M B O L _ U N H A N D L E D "
      ),

      // Step 3: Process each group of events concurrently.
      // For each group, apply the specific transformer defined in its config.
      mergeMap((grouped$) => {
        // Retrieve the configuration associated with this group's key.
        const config = _handlerRegistry.get(grouped$.key);

        if (!config) {
          // This group contains unhandled events.
          return grouped$.pipe(
            tap(([event]) => console.warn("Bloc: Unhandled event:", event)), // Log unhandled event
            mergeMap(() => EMPTY) // Discard the event from further processing
          );
        }

        // Define the `project` function passed to the event transformer.
        // This function encapsulates the actual execution of the user's EventHandler.
        const project = (event: Event): Observable<unknown> => {
          // Wrap the handler execution in a Promise sequence handled by `from`
          // to manage sync/async handlers uniformly and catch errors.
          return from(
            Promise.resolve().then(() => {
              // Create the context for the handler with a fresh state snapshot.
              const context: BlocContext<State> = {
                value: _stateSubject.getValue(), // Fresh state value for handler context
                update: updateState,
              };
              // Execute the user's handler function.
              return config.handler(event, context);
            })
          ).pipe(
            // Catch errors specifically from this handler's execution.
            catchError((error) => {
              const errorEvent = event; // Capture event in scope for error reporting
              console.error(
                `Bloc: Error in handler for "${String(
                  config.eventTypeIdentifier
                )}":`,
                error,
                "Event:",
                errorEvent
              );
              // Invoke the global error callback if provided.
              _onErrorCallback?.(error, errorEvent);
              // Emit the error details on the public errors$ stream.
              _errorSubject.next({ event: errorEvent, error });
              // Swallow the error by returning an empty Observable,
              // preventing it from terminating the main event stream.
              return EMPTY;
            })
          );
        };

        // Apply the specific concurrency transformer (e.g., concatMap, switchMap)
        // for this event type group.
        return grouped$.pipe(
          // Extract the event object from the [event, config] tuple used in grouping.
          // Cast to 'any' because the transformer expects a specific event type,
          // but type safety is ensured by the `on` overloads and the `project` function's closure.
          map(([event, _]) => event as any),
          // Apply the transformer (e.g., switchMap(project)).
          config.transformer(project)
        );
      }),
      // Global error handler for the entire event processing pipeline.
      // Catches errors not caught within individual handler's `catchError`.
      // Such errors usually indicate a problem in the RxJS pipeline itself.
      catchError((err) => {
        console.error(
          "Bloc: Unrecoverable error in event processing stream:",
          err
        );
        const streamError = err;
        const undefinedEvent = undefined as unknown as Event;
        // Report the stream error globally and on the errors$ stream.
        _onErrorCallback?.(streamError, undefinedEvent);
        _errorSubject.next({ event: undefinedEvent, error: streamError });
        // Close the Bloc on unrecoverable stream errors.
        close();
        // Terminate the stream.
        return EMPTY;
      }),
      // Finalize operator runs when the stream completes or errors.
      finalize(() => {
        // Can be used for logging, but typically the stream only ends when close() is called
        // or an unrecoverable error occurs.
        // console.log("Bloc: Event processing stream finalized.");
      })
    )
    .subscribe(); // Activate the event processing pipeline.

  // --- Cleanup (`close` method) ---

  /**
   * Internal implementation of the `close` method. Cleans up resources.
   * @internal
   */
  const close = (): void => {
    if (_isClosed) return; // Prevent multiple closes

    _isClosed = true; // Mark as closed

    // Unsubscribe from the main event processing pipeline.
    _subscription.unsubscribe();
    // Complete the subjects to signal completion to subscribers.
    _stateSubject.complete();
    _eventSubject.complete();
    _errorSubject.complete();
    // Clear the handler registry.
    _handlerRegistry.clear();
    // console.log("Bloc: Closed."); // Optional logging
  };

  // --- Create the Public API Object ---
  // This is the object returned to the user.

  /** @internal The public Bloc instance. */
  const bloc: Bloc<Event, State> = {
    /** Expose state changes as a shareReplayed Observable. */
    state$: _stateSubject.asObservable().pipe(shareReplay(1)),
    /** Provide synchronous access to the current state via a getter. */
    get state() {
      return getState();
    },
    /** Expose handler errors as an Observable stream. */
    errors$: _errorSubject.asObservable(),
    /** Expose the `on` method for registering handlers. */
    on,
    /** Expose the `add` method for dispatching events. */
    add,
    /** Expose the `close` method for cleanup. */
    close,
  };

  // Return the constructed Bloc instance.
  return bloc;
}
