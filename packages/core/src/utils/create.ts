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
  Subscription,
} from "./stream.js";
import {
  BlocContext,
  EventTransformer,
  EventHandler,
  EventHandlerFunction,
  Bloc,
  CreateBlocProps,
  CreatePipeBlocProps,
  ErrorHandler,
} from "../models/index.js";
import { generateShortID } from "./id.js";

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
 * Group key used for events that have no registered handler. A `Symbol` can
 * never collide with an event `type` string.
 * @internal
 */
const UNHANDLED = Symbol("bloqz.unhandled");

/**
 * Internal configuration stored within the Bloc's registry for each
 * registered event handler. This structure holds all the necessary pieces
 * to execute the correct handler with the appropriate concurrency strategy.
 * Handlers are looked up directly by the event's `type` string.
 *
 * @template State The state type for the Bloc.
 * @internal Should not be used directly by consumers of the library.
 */
interface HandlerConfig<State> {
  /**
   * The event handler function provided via the `handlers` object during
   * Bloc creation. This function contains the core logic to execute when a
   * matching event occurs.
   *
   * Note: The event payload type is `any` here because this is an internal
   * representation. The `handlers` object typing (`EventHandlersObject`)
   * ensures type safety for the *user-provided* handler function.
   */
  handler: EventHandlerFunction<any, State>;

  /**
   * The event `type` string this handler was registered under (the key in
   * the `handlers` object). Also used as the group key in the processing
   * pipeline and for error messages.
   */
  eventType: string;

  /**
   * The event transformer function (e.g., one returned by `sequential()`,
   * `restartable()`, etc., or a custom one) associated with this specific
   * event handler. This function dictates the concurrency behavior (how
   * multiple instances of the matching event are processed relative to each
   * other) by applying the appropriate RxJS operator internally.
   *
   * Note: The event type is `any` here internally. Type safety for the
   * transformer is handled by the `handlers` object typing.
   */
  transformer: EventTransformer<any>;
}

/**
 * Creates a HandlerConfig object from an event type and handler input.
 * Returns undefined if the input is undefined.
 *
 * @internal
 * @template State The state type.
 * @param {string} eventType The event `type` string (key of the `handlers` object).
 * @param {EventHandler<any, State> | undefined} handlerInput The handler input (function or definition object).
 * @returns {(HandlerConfig<State> | undefined)} A valid HandlerConfig or undefined.
 */
function createHandlerConfigEntry<State>(
  eventType: string,
  handlerInput: EventHandler<any, State> | undefined
): HandlerConfig<State> | undefined {
  // Skip keys whose handler is missing.
  if (!handlerInput) {
    return undefined;
  }

  if (typeof handlerInput === "function") {
    return {
      handler: handlerInput,
      eventType,
      transformer: defaultTransformer(),
    };
  }

  return {
    handler: handlerInput.handler,
    eventType,
    transformer: handlerInput.transformer ?? defaultTransformer(),
  };
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
 * @returns {Bloc<Event, State>} A Bloc instance adhering to the public `Bloc` API.
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
  const _errorSubject = new Subject<{
    event: Event | undefined;
    error: unknown;
  }>();
  /** @internal */
  const _onErrorCallback: ErrorHandler<Event> | undefined = onError;
  /** @internal */
  let _isClosed = false;

  // --- Populate Handler Registry from Handlers Object ---
  /** @internal Handlers keyed by event `type` for direct lookup. */
  const _handlerRegistry = new Map<string, HandlerConfig<State>>();
  for (const [eventType, handlerInput] of Object.entries(handlers)) {
    const config = createHandlerConfigEntry<State>(
      eventType,
      handlerInput as EventHandler<any, State> | undefined
    );
    // Only keep valid configs; the helper returns undefined for falsy inputs.
    if (config) _handlerRegistry.set(eventType, config);
  }

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
      // Step 1: Look up the handler configuration by the event's `type`.
      map((event): [Event, HandlerConfig<State> | undefined] => [
        event,
        _handlerRegistry.get(event.type),
      ]),

      // Step 2: Group events by the event type of their matched handler.
      // This ensures concurrency strategies (transformers) apply correctly per event type.
      // Unhandled events are grouped under the `UNHANDLED` symbol, which
      // cannot collide with any event type string.
      groupBy(([, config]) => config?.eventType ?? UNHANDLED),

      // Step 3: Process each group of events concurrently.
      // For each group, apply the specific transformer defined in its config.
      mergeMap((grouped$) => {
        // Retrieve the configuration associated with this group's key.
        const config =
          grouped$.key === UNHANDLED
            ? undefined
            : _handlerRegistry.get(grouped$.key);

        if (!config) {
          // This group contains unhandled events.
          return grouped$.pipe(
            tap(([event]) => console.warn("Bloc: Unhandled event:", event)), // Log unhandled event
            mergeMap(() => EMPTY) // Discard the event from further processing
          );
        }

        // Define the `project` function passed to the event transformer.
        // Each call represents one run of the user's EventHandler. The run is
        // tied to the subscription made by the transformer: when the
        // transformer unsubscribes (e.g. `switchMap` superseding it, or
        // `close()` tearing down the pipeline), the run is aborted — its
        // `signal` fires and its `update` becomes a no-op, so a cancelled
        // run can no longer overwrite newer state.
        const project = (event: Event): Observable<unknown> =>
          new Observable<unknown>((subscriber) => {
            const controller = new AbortController();
            const { signal } = controller;
            let finished = false;

            /** Per-run `update` that is ignored once the run is aborted. */
            const update: BlocContext<State>["update"] = (newValueOrFn) => {
              if (signal.aborted) return;
              updateState(newValueOrFn);
            };

            const reportError = (error: unknown): void => {
              console.error(
                `Bloc: Error in handler for "${config.eventType}":`,
                error,
                "Event:",
                event
              );
              // Invoke the global error callback if provided.
              _onErrorCallback?.(error, event);
              // Emit the error details on the public errors$ stream.
              _errorSubject.next({ event, error });
            };

            // Run the handler asynchronously (in a microtask) so sync and
            // async handlers are treated uniformly.
            Promise.resolve()
              .then(() => {
                // The run was cancelled (or the bloc closed) before it started.
                if (signal.aborted) return undefined;
                // Create the context for the handler with a frozen snapshot of
                // the state at the moment the handler starts executing. This
                // keeps the value stable for the handler's full lifetime
                // (including async work), even if other handlers update state
                // concurrently.
                const context: BlocContext<State> = {
                  id: bloc.id,
                  value: _stateSubject.getValue(),
                  update,
                  signal,
                };
                // Execute the user's handler function.
                return config.handler(event, context);
              })
              .then(
                (result) => {
                  if (signal.aborted) return;
                  finished = true;
                  subscriber.next(result);
                  subscriber.complete();
                },
                (error: unknown) => {
                  // Errors of an aborted run are not reported.
                  if (signal.aborted) return;
                  finished = true;
                  try {
                    reportError(error);
                  } catch (callbackError) {
                    // A throwing onError callback is a pipeline-level error.
                    subscriber.error(callbackError);
                    return;
                  }
                  // Swallow the handler error so it does not terminate the
                  // main event stream.
                  subscriber.complete();
                }
              );

            // Teardown: abort the run if it is unsubscribed before finishing.
            return () => {
              if (!finished) controller.abort();
            };
          });

        // Apply the specific concurrency transformer (e.g., concatMap, switchMap)
        // for this event type group.
        return grouped$.pipe(
          // Extract the event object from the [event, config] tuple used in grouping.
          // Cast to 'any' because the transformer expects a specific event type,
          // but type safety is ensured by the `handlers` object typing and the
          // `project` function's closure.
          map(([event, _]) => event as any),
          // Apply the transformer (e.g., switchMap(project)).
          config.transformer(project)
        );
      }),
      // Global error handler for the entire event processing pipeline.
      // Catches errors not handled by the per-run error boundary in `project`.
      // Such errors usually indicate a problem in the RxJS pipeline itself.
      catchError((err) => {
        console.error(
          "Bloc: Unrecoverable error in event processing stream:",
          err
        );
        // Report the stream error globally and on the errors$ stream.
        // Pipeline errors are not tied to a specific event.
        _onErrorCallback?.(err, undefined);
        _errorSubject.next({ event: undefined, error: err });
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

  // --- Create the Public API Object ---
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
 * `add` method is a no-op. If the source errors, the error is emitted on
 * `errors$` as `{ event: undefined, error }` and the bloc closes; if the
 * source completes, the bloc closes too.
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
   * The `BehaviorSubject` that holds the current state. It starts with the
   * optional `initialState` (or `undefined`) and then mirrors every value
   * emitted by `source$`.
   * @internal
   */
  const _stateSubject = new BehaviorSubject<State>(
    props.initialState as State
  );

  /**
   * Emits source errors (with `event: undefined`, since a pipe bloc has no
   * events) before the bloc closes.
   * @internal
   */
  const _errorSubject = new Subject<{
    event: Event | undefined;
    error: unknown;
  }>();

  /** @internal A boolean flag to track if the bloc has been closed. */
  let _isClosed = false;

  /**
   * The subscription to the source stream. It is `undefined` until
   * `source$.subscribe` returns, which matters when the source completes or
   * errors synchronously during subscription (e.g. `of(1)`, `EMPTY`).
   * @internal
   */
  let _sourceSubscription: Subscription | undefined;

  // --- Cleanup (`close` method) ---
  // Declared before subscribing so a synchronously finishing source can call it.
  /** @internal */
  const close = (): void => {
    if (_isClosed) return;
    _isClosed = true;

    // Unsubscribe from the source stream to stop receiving updates. If the
    // source finished synchronously, the subscription is not assigned yet and
    // is unsubscribed right after `subscribe` returns (see below).
    _sourceSubscription?.unsubscribe();

    // Complete the subjects to signal completion to all subscribers.
    _stateSubject.complete();
    _errorSubject.complete();
  };

  _sourceSubscription = source$.subscribe({
    next: (value) => _stateSubject.next(value),
    error: (error) => {
      // In a pipe bloc, the source stream's errors are considered fatal.
      console.error("PipeBloc: Source stream terminated with an error:", error);
      _errorSubject.next({ event: undefined, error });
      close();
    },
    // If the source stream completes, the bloc closes as well.
    complete: () => close(),
  });

  // The source finished synchronously during `subscribe`; release it now.
  if (_isClosed) {
    _sourceSubscription.unsubscribe();
  }

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

  // --- Create the Public API Object ---
  const bloc: Bloc<Event, State> = {
    id: id ?? generateShortID(),
    state$: _stateSubject.asObservable(),
    get state() {
      return _stateSubject.getValue();
    },
    errors$: _errorSubject.asObservable(),
    add,
    close,
    get isClosed() {
      return _isClosed;
    },
  };

  return bloc;
}
