import {
  Observable,
  Subject,
  BehaviorSubject,
  map,
  mergeMap,
  groupBy,
  tap,
  EMPTY,
  catchError,
  finalize,
  from,
} from "./stream.js";
import {
  BlocContext,
  EventTransformer,
  EventHandler,
  EventHandlerFunction,
  EventTypeIdentifier,
  Bloc,
  CreateBlocProps,
  CreatePipeBlocProps,
  ErrorHandler,
} from "../models/index.js";
import { generateShortID } from "./id.js";

// Assuming defaultTransformer and other required functions/types are defined or imported
// e.g., sequential, concurrent, restartable, droppable if used in examples/defaults
// Helper types assumed to be defined: EventTypeOf, ExtractEventByType

/**
 * Provides the default event transformer if none is specified.
 * Default is concurrent processing.
 * @internal
 */
function defaultTransformer<Event>(): EventTransformer<Event> {
  return (project) => mergeMap(project);
}

// --- Internal Types ---

/**
 * Internal configuration stored within the Bloc's registry for each
 * registered event handler. This structure holds all the necessary pieces
 * to match an incoming event and execute the correct handler with the
 * appropriate concurrency strategy.
 *
 * @template Event The base event union type for the Bloc.
 * @template State The state type for the Bloc.
 * @internal Should not be used directly by consumers of the library.
 */
interface HandlerConfig<Event, State> {
  /**
   * The predicate function used to determine if an incoming event instance
   * matches the specific event type this configuration is intended for.
   * This function is derived from the `eventTypeIdentifier` (string literal
   * or type predicate function) provided during handler registration.
   *
   * @param event An incoming event object from the `Event` union.
   * @returns {boolean} `true` if the event matches, `false` otherwise.
   */
  predicate: (event: Event) => boolean;

  /**
   * The actual event handler function provided by the user via `on` or
   * the `handlers` object during Bloc creation. This function contains the
   * core logic to execute when a matching event occurs.
   *
   * Note: The event payload type is `any` here because this is an internal
   * representation. The public-facing API (`on` method overloads or the
   * `handlers` object typing) ensures type safety for the *user-provided*
   * handler function based on the specific `eventTypeIdentifier`.
   */
  handler: EventHandlerFunction<any, State>;

  /**
   * The original identifier (either the event type string literal or the
   * type predicate function reference) used when this handler was registered.
   * This is stored primarily for internal purposes like grouping events in
   * the processing pipeline and potentially for debugging or future features
   * (e.g., unregistering handlers).
   */
  eventTypeIdentifier: EventTypeIdentifier<Event, any>;

  /**
   * The event transformer function (e.g., one returned by `sequential()`,
   * `restartable()`, etc., or a custom one) associated with this specific
   * event handler. This function dictates the concurrency behavior (how
   * multiple instances of the matching event are processed relative to each
   * other) by applying the appropriate RxJS operator internally.
   *
   * Note: The event type is `any` here internally. Type safety for the
   * transformer is handled during the registration phase based on the
   * specific event type being registered.
   */
  transformer: EventTransformer<any>;
}

/**
 * Creates a HandlerConfig object from an event type identifier and handler input.
 * Returns undefined if the input is invalid or undefined.
 *
 * @internal
 * @template Event The base event union type.
 * @template State The state type.
 * @param {string} eventTypeIdentifier The string identifying the event type.
 * @param {HandlerConfigInput<any, State> | undefined} handlerInput The handler input (function or definition object).
 * @returns {(HandlerConfig<Event, State> | undefined)} A valid HandlerConfig or undefined.
 */
function createHandlerConfigEntry<Event extends { type: string }, State>(
  eventTypeIdentifier: string, // Key is always string here
  handlerInput: EventHandler<any, State> | undefined
): HandlerConfig<Event, State> | undefined {
  // If the input for this key is undefined or undefined, skip it
  if (!handlerInput) {
    return undefined;
  }

  // Predicate always checks type against the identifier string
  const predicate = (event: Event): event is any =>
    event.type === eventTypeIdentifier;

  if (typeof handlerInput === "function") {
    // Return the fully constructed config object
    return {
      predicate,
      handler: handlerInput,
      // We cast the string key back to the broader EventTypeIdentifier type for internal consistency,
      // although in this specific flow, it's always a string.
      eventTypeIdentifier: eventTypeIdentifier as EventTypeIdentifier<
        Event,
        any
      >,
      transformer: defaultTransformer(),
    };
  } else {
    // Return the fully constructed config object
    return {
      predicate,
      handler: handlerInput.handler,
      // We cast the string key back to the broader EventTypeIdentifier type for internal consistency,
      // although in this specific flow, it's always a string.
      eventTypeIdentifier: eventTypeIdentifier as EventTypeIdentifier<
        Event,
        any
      >,
      transformer: handlerInput.transformer ?? defaultTransformer(),
    };
  }
}

// --- Factory Function (`createBloc`) ---

/**
 * Creates a new Bloc instance for managing state based on events.
 * Event handlers and their concurrency strategies are defined upfront via the `handlers` object.
 * Handlers can be provided as functions directly, or as objects with handler/transformer properties.
 * It sets up the internal state management, event processing pipeline,
 * and provides the public API for interacting with the Bloc.
 *
 * **Limitation:** This creation method only supports events identified via a `type` string property
 * (discriminated unions). Type predicate identifiers are not supported with the `handlers` object.
 *
 * @export
 * @template Event The base union type for all possible events (must have a 'type' string property).
 * @template State The type representing the state managed by this Bloc.
 * @param {CreateBlocProps<Event, State>} props An object containing the configuration properties
 *   for the Bloc: `initialState`, `handlers` object, and optional `onError`.
 * @returns {Bloc<Event, State>} A Bloc instance adhering to the public API (without the `on` method).
 * @example
 * const counterBloc = createBloc({
 *   initialState: { count: 0, status: 'idle' },
 *   handlers: {
 *     INCREMENT: (event, { update }) => { // event is inferred as IncrementEvent
 *       update(s => ({ ...s, count: s.count + event.amount }));
 *     },
 *     DECREMENT: {
 *       handler: (event, { update }) => { // event is inferred as DecrementEvent
 *         update(s => ({ ...s, count: s.count - event.amount }));
 *       },
 *       transformer: sequential() // Example using imported sequential transformer
 *     }
 *   },
 *   onError: (error, event) => console.error('Bloc Error:', error, event)
 * });
 */
export function createBloc<Event extends { type: string }, State>(
  props: CreateBlocProps<Event, State>
): Bloc<Event, State> {
  // --- Destructure properties from props ---
  const { initialState, handlers, onError } = props;

  // --- Private State & Subjects (managed by closure) ---
  /** @internal */
  const _stateSubject = new BehaviorSubject<State>(initialState);
  /** @internal */
  const _eventSubject = new Subject<Event>();
  /** @internal */
  const _errorSubject = new Subject<{ event: Event; error: unknown }>();
  /** @internal */
  const _onErrorCallback: ErrorHandler<Event> | undefined = onError;
  /** @internal */
  let _isClosed = false;

  // --- Populate Handler Registry from Handlers Object ---
  const handlerConfigs = Object.entries(handlers)
    .map(([eventTypeIdentifier, handlerInput]) =>
      // Create a config entry (or undefined) for each item in the handlers object
      createHandlerConfigEntry<Event, State>(
        eventTypeIdentifier,
        handlerInput as EventHandler<any, State> | undefined // Ensure type matches helper
      )
    )
    // Filter out any undefined results (from undefined inputs or potential future validation)
    .filter(
      (config): config is HandlerConfig<Event, State> => config !== undefined
    ); // Type predicate for safety

  /** @internal Use a Map internally for consistency */
  const _handlerRegistry = new Map<
    EventTypeIdentifier<Event, any>,
    HandlerConfig<Event, State>
  >(
    // Convert the array of valid config objects into Map entries
    handlerConfigs.map((config) => [config.eventTypeIdentifier, config])
  );

  // --- State Update Function ---
  /** @internal */
  const updateState = (
    newValueOrFn: State | ((currentState: State) => State)
  ): void => {
    if (_isClosed) {
      console.warn("Bloc: Attempted to update state after closed.");
      return;
    }
    const currentState = _stateSubject.getValue();
    const nextState =
      typeof newValueOrFn === "function"
        ? (newValueOrFn as (currentState: State) => State)(currentState)
        : newValueOrFn;
    if (nextState !== currentState) {
      _stateSubject.next(nextState);
    }
  };

  // --- Event Dispatch (`add` method) ---
  /** @internal */
  const add = (event: Event): void => {
    if (_isClosed) {
      console.warn("Bloc: Attempted to add event after closed.");
      return;
    }
    _eventSubject.next(event);
  };

  // --- State Getter ---
  /** @internal */
  const getState = (): State => _stateSubject.getValue();

  // --- Core Event Processing Logic ---
  /** @internal */
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
          config?.eventTypeIdentifier ?? " S Y M B O L _ U N H A N D L E D " // Key is now always string or symbol
      ),

      // Step 3: Process each group of events concurrently.
      // For each group, apply the specific transformer defined in its config.
      mergeMap((grouped$) => {
        // Retrieve the configuration associated with this group's key.
        const config = _handlerRegistry.get(grouped$.key); // Get config using string key

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
                id: bloc.id,
                get value(): State {
                  return _stateSubject.getValue(); // Fresh state value for handler context
                },
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
  /** @internal */
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

  // --- Create the Public API Object (without `on`) ---
  /** @internal The public Bloc instance. */
  const bloc: Bloc<Event, State> = {
    id: props.id ?? generateShortID(),
    state$: _stateSubject.asObservable(),
    get state() {
      return getState();
    },
    errors$: _errorSubject.asObservable(),
    add,
    close,
    get isClosed() {
      return _isClosed;
    },
  };

  // Return the constructed Bloc instance.
  return bloc;
}

/**
 * Creates a Bloc instance that pipes state from an external source Observable.
 *
 * This is a special type of Bloc that does not process events. Its state is
 * driven entirely by an observable stream provided during creation. The
 * `add` method is a no-op, and the `errors$` stream is always empty.
 *
 * It is useful for wrapping an existing reactive state source (like a
 * database listener or another stream) with the standard `Bloc` interface,
 * allowing it to be used in a Bloc-centric architecture.
 *
 * @export
 * @template Event A generic type for events. Since this Bloc doesn't handle them,
 * it can be a simple `unknown` or `void`.
 * @template State The type representing the state managed by this Bloc.
 * @param {CreatePipeBlocProps<State, Event>} props The props object containing
 * the source observable and an optional ID.
 * @returns {Bloc<Event, State>} A Bloc instance that pipes states from the
 * source stream.
 * @example
 * // Create a source stream, e.g., a timer
 * const timer$ = interval(1000).pipe(map(i => ({ value: i })));
 *
 * // Create a pipe bloc that listens to the timer
 * const timerBloc = createPipeBloc({ source$: timer$ });
 *
 * timerBloc.state$.subscribe(state => {
 * console.log('Current state:', state); // Logs { value: 0 }, { value: 1 }, etc.
 * });
 *
 * // The `add` method is a no-op
 * timerBloc.add({ type: 'NO_OP' });
 *
 * // Remember to close the bloc to prevent memory leaks
 * setTimeout(() => timerBloc.close(), 5000);
 */
export function createPipeBloc<Event, State>(
  props: CreatePipeBlocProps<State>
): Bloc<Event, State> {
  // --- Destructure properties from props ---
  const { source$, id } = props;

  // --- Private State & Subjects (managed by closure) ---
  /**
   * The `BehaviorSubject` that will hold the current state.
   * Its initial value is derived from the first value of the source$ stream
   * or a default `undefined` if the source is an empty observable.
   * We will need to subscribe to the source to get this value.
   * @internal
   */
  const _stateSubject = new BehaviorSubject<State>(props.initialState);

  /** @internal A boolean flag to track if the bloc has been closed. */
  let _isClosed = false;

  /**
   * The subscription to the source stream. This needs to be stored so we can
   * unsubscribe from it when the bloc is closed.
   * @internal
   */
  const _sourceSubscription = source$.subscribe({
    next: (value) => _stateSubject.next(value),
    error: (err) => {
      // In a pipe bloc, the source stream's errors are considered fatal.
      console.error("PipeBloc: Source stream terminated with an error:", err);
      // The `errors$` stream is empty, so we just log and close.
      close();
    },
    complete: () => {
      // If the source stream completes, we also close the bloc.
      if (!_stateSubject) {
        // Handle the case where the source completes before emitting any value
        // We'll create a BehaviorSubject with a default value and then complete it.
        // This behavior might need refinement depending on user expectations.
        // For now, let's just log and close, as the `state` would never be set.
        console.warn(
          "PipeBloc: Source stream completed without emitting any state."
        );
      }
      close();
    },
  });

  // --- Event Dispatch (`add` method) ---
  /**
   * The `add` method for a `createPipeBloc` is a no-op. It simply logs a warning
   * because this type of Bloc is not designed to process events.
   * @internal
   */
  const add = (event: Event): void => {
    if (!_isClosed) {
      console.warn(
        "Bloc: Attempted to add event to a PipeBloc. Events are not handled by this type of bloc."
      );
    }
  };

  // --- Cleanup (`close` method) ---
  /** @internal */
  const close = (): void => {
    if (_isClosed) return;
    _isClosed = true;

    // Unsubscribe from the source stream to stop receiving updates.
    _sourceSubscription.unsubscribe();

    // Complete the state subject to signal completion to all subscribers.
    _stateSubject.complete();
    // No event or error subjects to complete as they are empty.
  };

  // --- Create the Public API Object ---
  const bloc: Bloc<Event, State> = {
    id: id ?? generateShortID(),
    state$: _stateSubject.asObservable(),
    get state() {
      return _stateSubject.getValue();
    },
    errors$: EMPTY as Observable<{ event: Event; error: unknown }>, // A pipe bloc has no events or handlers to produce errors.
    add,
    close,
    get isClosed() {
      return _isClosed;
    },
  };

  return bloc;
}
