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
   * A frozen snapshot of the Bloc's state taken when the event handler started
   * processing. It does not change for the duration of the handler execution,
   * even for async handlers while other events update state concurrently.
   * Use this for decisions based on the state at the time the event arrived.
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
   * Once this handler run is aborted (see `signal`), calls to `update` are
   * ignored, so a cancelled run cannot overwrite newer state.
   *
   * @param newValueOrFn The new state value or a function to compute the new state.
   */
  readonly update: (newValue: State | ((currentState: State) => State)) => void;

  /**
   * An `AbortSignal` for this handler run. It is aborted when the run is
   * cancelled before it finishes — e.g. superseded by a newer event under
   * `restartable()` (switchMap), or when the Bloc is closed. Pass it to
   * cancellable APIs (`fetch(url, { signal })`) or check `signal.aborted`
   * to stop work early. After abort, `update` is a no-op.
   *
   * @example
   * SEARCH: {
   *   transformer: restartable(),
   *   handler: async (event, { update, signal }) => {
   *     const res = await fetch(`/search?q=${event.query}`, { signal });
   *     update(await res.json());
   *   },
   * }
   */
  readonly signal: AbortSignal;
}
