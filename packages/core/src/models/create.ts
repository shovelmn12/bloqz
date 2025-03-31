import { ErrorHandler, EventHandlersObject } from "@/models";

/**
 * Properties required for creating a Bloc instance using `createBloc`.
 * Handlers are provided upfront via the `handlers` object.
 *
 * @template Event The base event union type for the Bloc (must use discriminated unions with a 'type' property).
 * @template State The state type for the Bloc.
 */
export interface CreateBlocProps<Event, State> {
  /** The initial state the Bloc should start with. */
  initialState: State;
  /**
   * An object where keys are the string literal values of the 'type' property
   * from the Event union. Values can be either:
   * 1. The `EventHandler` function directly (uses default transformer).
   * 2. An `EventHandlerDefinition` object `{ handler: ..., transformer?: ... }`
   *    for specifying a custom transformer.
   */
  handlers: EventHandlersObject<Event, State>;
  /**
   * Optional callback function invoked globally whenever an error occurs
   * *within* any registered event handler during its execution.
   */
  onError?: ErrorHandler<Event>;
}
