import { Context, useSyncExternalStore } from "./react.js";
import { useBloc } from "./use.js";
import { map, distinctUntilChanged } from "./stream.js";
import { Bloc } from "@bloc/core";

/**
 * A React Hook that subscribes to the state stream (`state$`) of a Bloc provided
 * via React Context, applies a selector function to each state emission, and
 * returns the selected value.
 *
 * This hook optimizes re-renders by ensuring the component only updates when the
 * *result* of the selector function changes, rather than the entire state object.
 * It's particularly useful for deriving computed values or selecting specific slices
 * of the state.
 *
 * It utilizes `useSyncExternalStore` for safe and efficient subscription.
 *
 * Must be used within a component tree wrapped by the corresponding `BlocContext.Provider`.
 *
 * @export
 * @template Event The event union type of the Bloc expected in the context.
 * @template State The full state type of the Bloc expected in the context.
 * @template T The type of the value returned by the `selector` function.
 * @param {Context<Bloc<Event, State>>} context The specific React Context object created by `createBlocContext`.
 * @param {(state: State) => T} selector A function that takes the full Bloc state and returns a selected or derived value.
 *   **Important:** For performance, this function should be memoized (e.g., using `useCallback` if defined inline)
 *   or defined outside the component to prevent unnecessary re-subscriptions within `useSyncExternalStore`
 *   if the component re-renders.
 * @returns {T} The latest selected or derived value based on the Bloc's state.
 * @see https://react.dev/reference/react/useSyncExternalStore
 * @see {@link useBloc}
 * @see {@link useBlocState}
 * @example
 * // MyCounterStatusDisplay.tsx
 * import React, { useCallback } from 'react';
 * import { useBlocSelectState } from '@bloc/react';
 * import { CounterBlocContext, CounterState } from './counter.context';
 *
 * function MyCounterStatusDisplay() {
 *   // Select only the status string from the state
 *   const selectStatus = useCallback((state: CounterState) => state.status, []);
 *   const status = useBlocSelectState(CounterBlocContext, selectStatus);
 *
 *   // This component only re-renders when the status string changes.
 *   console.log('Rendering Status Display');
 *
 *   return <p>Current Status: {status}</p>;
 * }
 */
export function useBlocSelectState<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  selector: (state: State) => T
): T {
  // 1. Get the Bloc instance from the provided context
  const bloc = useBloc(context);

  // 2. Use useSyncExternalStore to subscribe and select
  const state = useSyncExternalStore(
    // subscribe: Subscribe to the original state stream, but pipe the selector
    // through an RxJS map operator BEFORE subscribing React's change listener.
    // This ensures React is only notified when the *selected* value potentially changes.
    (onStoreChange) => {
      // console.log('useBlocSelectState: Subscribing with selector'); // Debugging
      const subscription = bloc.state$
        .pipe(
          // Apply the selector transformation within the stream
          map(selector),
          distinctUntilChanged()
        )
        .subscribe(onStoreChange); // Subscribe React's listener to the *mapped* stream

      return () => {
        // console.log('useBlocSelectState: Unsubscribing'); // Debugging
        subscription.unsubscribe();
      };
    },
    // getSnapshot: Get the current full state and apply the selector synchronously.
    () => selector(bloc.state),
    // getServerSnapshot: Get the server state and apply the selector synchronously.
    () => selector(bloc.state)
  );

  // 3. Return the latest selected state
  return state;
}
