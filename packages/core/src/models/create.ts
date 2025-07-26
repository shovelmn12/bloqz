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
