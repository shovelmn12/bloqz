/**
 * Provides context to event handlers, including the current state snapshot
 * and a function to update the state.
 *
 * @template State The type of the state managed by the Bloc.
 */
export interface BlocContext<State> {
  /**
   * A unique identifier for this specific Bloc instance. Useful for debugging,
   * logging, or distinguishing between multiple Blocs of the same type.
   */
  readonly id: string;

  /**
   * A read-only snapshot of the Bloc's state at the time the event handler
   * started processing. Use this to make decisions based on the current state.
   */
  readonly value: State;

  /**
   * A function to update the Bloc's state.
   * It can be called with either:
   * - The new state value directly.
   * - A function that receives the current state and returns the new state.
   * State updates are processed asynchronously and may not be reflected
   * immediately in the `value` property within the same handler execution.
   *
   * @param newValueOrFn The new state value or a function to compute the new state.
   */
  readonly update: (newValue: State | ((currentState: State) => State)) => void;
}
