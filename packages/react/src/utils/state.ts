import { Context, useSyncExternalStore } from "./react.js";
import { useBloc } from "./use.js";
import { Bloc } from "@bloqz/core";

/**
 * A React Hook that subscribes to the state stream (`state$`) of a Bloc provided
 * via React Context and returns the latest state value.
 *
 * This hook ensures the component re-renders whenever the Bloc's state changes.
 * It utilizes `useSyncExternalStore` for safe and efficient subscription to the
 * external Bloc state, ensuring compatibility with React's concurrent features.
 *
 * Must be used within a component tree wrapped by the corresponding `BlocContext.Provider`.
 *
 * @export
 * @template Event The event union type of the Bloc expected in the context.
 * @template State The state type of the Bloc expected in the context.
 * @param {Context<Bloc<Event, State>>} context The specific React Context object created by `createBlocContext`.
 * @returns {State} The latest state value emitted by the Bloc.
 * @see https://react.dev/reference/react/useSyncExternalStore
 * @see {@link useBloc}
 * @example
 * // MyCounterDisplay.tsx
 * import React from 'react';
 * import { useBlocState } from '@bloqz/react';
 * import { CounterBlocContext } from './counter.context';
 *
 * function MyCounterDisplay() {
 *   // Get the latest state reactively from the Bloc provided by CounterBlocContext
 *   const state = useBlocState(CounterBlocContext);
 *
 *   return (
 *     <div>
 *       <p>Status: {state.status}</p>
 *       <p>Count: {state.count}</p>
 *     </div>
 *   );
 * }
 */
export function useBlocState<Event, State>(
  context: Context<Bloc<Event, State>>
): State {
  // 1. Get the Bloc instance from the provided context
  const bloc = useBloc(context);

  // 2. Use useSyncExternalStore to subscribe to the Bloc's state stream
  const state = useSyncExternalStore(
    // subscribe: This function is called by React to set up the subscription.
    // It must return an unsubscribe function.
    (onStoreChange) => {
      // console.log('useBlocState: Subscribing'); // Optional: for debugging
      // Subscribe to the state$ observable.
      // Call the provided `onStoreChange` callback whenever the observable emits a new value.
      // React uses this callback to know when to trigger a re-render.
      const subscription = bloc.state$.subscribe(onStoreChange);
      // Return the cleanup function that unsubscribes from the observable.
      return () => {
        // console.log('useBlocState: Unsubscribing'); // Optional: for debugging
        subscription.unsubscribe();
      };
    },
    // getSnapshot: This function is called by React to get the current value
    // of the store synchronously. It should return the current state.
    () => bloc.state,
    // getServerSnapshot: This function provides the initial state value used during
    // server rendering and hydration. It should match the initial client state.
    () => bloc.state
  );

  // 3. Return the latest state obtained from the store
  return state;
}
