import { useMemo, useEffect } from "react";
import { createBloc, Bloc, CreateBlocProps } from "@bloc/core";

/**
 * A React Hook that creates and memoizes a Bloc instance, automatically
 * handling its cleanup via `bloc.close()` when the component unmounts.
 *
 * This hook wraps the core `createBloc` factory function within `useMemo`
 * with an empty dependency array (`[]`). This ensures that the Bloc instance
 * is created only **once** when the component using the hook first mounts,
 * and the same instance is returned on every subsequent render.
 *
 * It also uses `useEffect` to register the `bloc.close` method as a cleanup
 * function, ensuring resources are released when the component instance
 * associated with this hook unmounts.
 *
 * This is the recommended way to instantiate Blocs within React components,
 * particularly when providing them via Context, as it guarantees a stable
 * instance and handles cleanup automatically.
 *
 * @export
 * @template Event The base union type for all possible events the Bloc can process
 *                 (must have a 'type' string property).
 * @template State The type representing the state managed by the Bloc.
 * @param {CreateBlocProps<Event, State>} props An object containing the configuration properties
 *   (initialState, handlers, onError) needed to create the Bloc instance.
 *   **Note:** Since the `useMemo` dependency array is empty, changes to the `props` object
 *   passed on subsequent renders will **not** cause the Bloc to be recreated. The initial
 *   `props` object from the first render is used. Consider lifting state up or using refs
 *   if dynamically changing props needs to influence Bloc creation (though usually Bloc
 *   recreation is avoided).
 * @returns {Bloc<Event, State>} A stable, memoized Bloc instance that will be automatically closed on unmount.
 * @see https://react.dev/reference/react/useMemo
 * @see https://react.dev/reference/react/useEffect (for cleanup behavior)
 * @see {@link createBloc}
 * @example
 * // CounterProvider.tsx
 * import React from 'react';
 * import { useCreateBloc } from '@bloc/react';
 * import { CounterContext } from './counter.context';
 * import { initialState, handlers, CounterEvent, CounterState } from './types';
 *
 * function CounterProvider({ children }) {
 *   // Create and automatically manage the lifecycle of the Bloc instance
 *   const counterBloc = useCreateBloc<CounterEvent, CounterState>({
 *     initialState,
 *     handlers,
 *   });
 *   // No separate useEffect needed for bloc.close() in this component
 *
 *   return (
 *     <CounterContext.Provider value={counterBloc}>
 *       {children}
 *     </CounterContext.Provider>
 *   );
 * }
 */
export function useCreateBloc<Event extends { type: string }, State>(
  props: CreateBlocProps<Event, State>
): Bloc<Event, State> {
  // Create the Bloc instance only once using useMemo with empty dependencies.
  const bloc = useMemo(() => createBloc<Event, State>(props), []); // Empty array means props from first render are used

  // Set up an effect to call bloc.close() when the component unmounts
  // or when the bloc instance itself changes (which shouldn't happen with useMemo([])).
  // Passing bloc.close directly as the effect cleanup function is concise.
  useEffect(() => {
    // The cleanup function returned by useEffect
    return bloc.close;
  }, [bloc]); // Dependency array includes bloc to satisfy lint rules, but it's stable

  // Return the stable, memoized bloc instance.
  return bloc;
}
