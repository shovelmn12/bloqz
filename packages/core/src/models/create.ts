import { Observable } from "rxjs";
import { ErrorHandler, EventHandlersObject } from "../models/index.js";

/**
 * Properties required for creating a Bloc instance using `createBloc`.
 * Handlers are provided upfront via the `handlers` object.
 *
 * @template Event The base event union type for the Bloc (must use discriminated unions with a 'type' property).
 * @template State The state type for the Bloc.
 */
export interface CreateBlocProps<Event, State> {
  /**
   * An optional, unique identifier for this specific Bloc instance.
   * If not provided, a unique ID will be automatically generated.
   * This is primarily used for debugging, logging, or distinguishing between
   * multiple Blocs of the same type in an application.
   */
  readonly id?: string;

  /** The initial state the Bloc should start with. */
  readonly initialState: State;
  /**
   * An object where keys are the string literal values of the 'type' property
   * from the Event union. Values can be either:
   * 1. The `EventHandler` function directly (uses default transformer).
   * 2. An `EventHandlerDefinition` object `{ handler: ..., transformer?: ... }`
   *    for specifying a custom transformer.
   */
  readonly handlers: EventHandlersObject<Event, State>;
  /**
   * Optional callback function invoked globally whenever an error occurs
   * *within* any registered event handler during its execution.
   */
  readonly onError?: ErrorHandler<Event>;
}

/**
 * Properties required for creating a Pipe Bloc instance using `createPipeBloc`.
 *
 * @template Event A generic type for events. Since this Bloc doesn't handle them,
 * it can be a simple `unknown` or `void`.
 * @template State The type representing the state managed by this Bloc.
 */
export interface CreatePipeBlocProps<Event, State> {
  /**
   * An optional, unique identifier for this specific Bloc instance.
   * If not provided, a unique ID will be automatically generated.
   * This is primarily used for debugging, logging, or distinguishing between
   * multiple Blocs of the same type in an application.
   */
  readonly id?: string;

  /** The initial state the Bloc should start with. */
  readonly initialState: State;

  /**
   * The source Observable stream that will drive the state of this Bloc.
   * The Bloc's state will always reflect the latest value emitted by this stream.
   */
  readonly source$: Observable<State>;
}
