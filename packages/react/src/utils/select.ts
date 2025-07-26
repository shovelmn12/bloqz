import { Context, useSyncExternalStore, useCallback, useRef } from "./react.js";
import { useBloc } from "./use.js";
import { map, distinctUntilChanged } from "./stream.js";
import { Bloc } from "@bloc/core";
import { isEqual } from "lodash";

/**
 * @summary Subscribes to a slice of a Bloc's state with performance optimizations.
 *
 * @description
 * A React Hook that connects to a Bloc from context and extracts a slice of its
 * state using a selector function. This hook is highly optimized to prevent
 * unnecessary re-renders in components that only depend on a small part of a
 * larger state object.
 *
 * It leverages `useSyncExternalStore` for a concurrent-safe subscription to a
 * derived data stream.
 *
 * @remarks
 * **Performance and Optimization:**
 * This hook is optimized in two ways:
 * 1.  **Selector Application:** It applies the `selector` function within an RxJS-like stream pipeline.
 * 2.  **Deep Equality Check:** It uses `distinctUntilChanged` with `lodash.isEqual` to
 *     filter out emissions where the selected data has not meaningfully changed.
 *     Your component will *not* re-render if the state object's reference changes
 *     but the selected data remains deeply equal.
 *
 * @export
 * @template Event The event union type of the Bloc expected in the context.
 * @template State The full state type of the Bloc expected in the context.
 * @template T The type of the value returned by the `selector` function.
 * @param {Context<Bloc<Event, State>>} context The React Context object for the Bloc.
 * @param {(state: State) => T} selector A pure function that transforms the Bloc's state into the desired value.
 *   **Important:** This function's reference must be stable across re-renders to prevent
 *   the subscription within `useSyncExternalStore` from being torn down and recreated
 *   unnecessarily. Memoize it with `useCallback` or define it outside the component.
 * @returns {T} The latest value of the selected state slice.
 * @see https://react.dev/reference/react/useSyncExternalStore
 * @see {@link useBloc} for accessing the full Bloc instance.
 * @see {@link useBlocState} for subscribing to the entire state object.
 * @see {@link createBlocContext} for creating the context object.
 * @example
 * // MyCounterStatusDisplay.tsx
 * import React, { useCallback } from 'react';
 * import { useBlocSelectState } from '@bloc/react';
 * import { CounterBlocContext, CounterState } from './counter.context';
 *
 * function MyCounterStatusDisplay() {
 *   // Select only the 'status' string from the state.
 *   // useCallback ensures the selector function has a stable reference.
 *   const selectStatus = useCallback((state: CounterState) => state.status, []);
 *   const status = useBlocSelectState(CounterBlocContext, selectStatus);
 *
 *   // This component only re-renders when the status string *actually* changes,
 *   // e.g., from 'idle' to 'incrementing'.
 *   console.log('Rendering Status Display');
 *
 *   return <p>Current Status: {status}</p>;
 * }
 */
export function useBlocSelectState<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  selector: (state: State) => T
): T {
  // 1. Get the Bloc instance from the provided context.
  const bloc = useBloc(context);
  const ref = useRef<T>(selector(bloc.state));

  // 2. Use useSyncExternalStore for a concurrent-safe subscription.
  return useSyncExternalStore<T>(
    // The subscribe function sets up our connection to the Bloc's stream.
    // React will memoize this function and only re-subscribe if its dependencies change.
    useCallback(
      (onStoreChange) => {
        // The core optimization: map to the new value, then only emit if it's truly different.
        const subscription = bloc.state$
          .pipe(map(selector), distinctUntilChanged(isEqual))
          .subscribe((state) => {
            // When a new, distinct value arrives, update our local ref...
            ref.current = state;
            // ...and then manually notify React that the external store has changed.
            onStoreChange();
          });

        return () => subscription.unsubscribe();
      },
      // Corrected dependencies: The hook must re-subscribe if the bloc instance
      // or the selector function itself changes.
      [bloc, ref, selector]
    ),
    // The getSnapshot function provides React with the current value.
    // It must be synchronous and simply read from our ref.
    () => ref.current
  );
}
