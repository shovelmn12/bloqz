import { createContext, Context } from "react";
import { createBloc, Bloc, CreateBlocProps } from "@bloc/core";

/**
 * Creates a React Context specifically designed to hold and provide a Bloc instance.
 * This function initializes a Bloc using the provided properties (initial state and optional error handler)
 * and sets that Bloc instance as the default value for the created React Context.
 *
 * Use the returned Context object's `Provider` component higher up in your component tree
 * to make the Bloc instance available to descendant components via the `useBloc` hook (or `useContext`/`use`).
 * Providing a specific, stable Bloc instance via the Provider is generally recommended over
 * relying on the default value created here, especially to avoid recreating the Bloc on every render.
 *
 * @export
 * @template Event The base union type for all possible events the Bloc can process.
 * @template State The type representing the state managed by the Bloc.
 * @param {CreateBlocProps<Event, State>} props An object containing the properties (`initialState`, `onError`) needed to create the default Bloc instance for this context.
 * @returns {Context<Bloc<Event, State>>} A React Context object whose default value is the newly created Bloc instance.
 * @see https://react.dev/reference/react/createContext
 * @see {@link CreateBlocProps}
 * @example
 * // counter.context.ts
 * import { createBlocContext } from 'your-bloc-library';
 * import { CounterEvent, CounterState } from './types';
 *
 * export const CounterBlocContext = createBlocContext<CounterEvent, CounterState>({
 *   initialState: { count: 0, status: 'idle' }
 * });
 *
 * // App.tsx
 * import React, { useMemo } from 'react';
 * import { CounterBlocContext } from './counter.context';
 * import { createBloc } from 'your-bloc-library';
 * import { initialState } from './types';
 *
 * function App() {
 *   // Recommended: Create Bloc instance outside or memoize it
 *   const counterBloc = useMemo(() => createBloc({ initialState }), []);
 *
 *   return (
 *     // Provide the memoized instance via the Provider
 *     <CounterBlocContext.Provider value={counterBloc}>
 *       <MyCounterDisplay />
 *       <MyCounterButtons />
 *     </CounterBlocContext.Provider>
 *   );
 * }
 */
export function createBlocContext<Event, State>(
  props: CreateBlocProps<Event, State> // Accepts the props object
): Context<Bloc<Event, State>> {
  // Creates a context with a default Bloc instance configured via props.
  // Note: This default instance is created *once* when createBlocContext is called.
  // If this function is called multiple times (e.g., inside a component),
  // multiple default instances (and contexts) would be created.
  return createContext(createBloc<Event, State>(props));
}
