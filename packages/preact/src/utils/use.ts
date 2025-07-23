import { use, Context } from "@/utils/preact";
import { Bloc } from "@bloc/core";

/**
 * A custom React Hook to consume a Bloc instance from a specific Bloc React Context.
 * It retrieves the Bloc provided by the nearest matching `Context.Provider` higher
 * up in the component tree.
 *
 * Throws an error if used outside of a corresponding `BlocContext.Provider`.
 *
 * @export
 * @template Event The event union type of the Bloc expected in the context.
 * @template State The state type of the Bloc expected in the context.
 * @param {Context<Bloc<Event, State>>} context The specific React Context object created by `createBlocContext`.
 * @returns {Bloc<Event, State>} The Bloc instance provided by the context.
 * @throws {Error} If the hook is called outside of a matching Context Provider.
 * @see https://react.dev/reference/react/useContext (or https://react.dev/reference/react/use)
 * @example
 * // MyCounterDisplay.tsx
 * import React from 'react';
 * import { useBloc } from '@bloc/react';
 * import { CounterBlocContext } from './counter.context';
 * import { useBlocState } from './useBlocState'; // Assuming a state hook exists
 *
 * function MyCounterDisplay() {
 *   const bloc = useBloc(CounterBlocContext); // Get the bloc instance
 *   const state = useBlocState(bloc); // Use a hook to subscribe to state
 *
 *   // Or use bloc directly: const state = useSyncExternalStore(...)
 *
 *   return <p>Count: {state.count}</p>;
 * }
 */
export function useBloc<Event, State>(
  context: Context<Bloc<Event, State>>
): Bloc<Event, State> {
  // Uses React's context mechanism to access the provided Bloc instance.
  const bloc = use(context); // `use` is the modern way, similar to useContext

  // Ensure the Bloc context value exists. This guards against using the hook
  // outside of a necessary Provider component.
  if (!bloc) {
    throw new Error("useBloc must be used within a BlocContext.Provider");
  }

  return bloc;
}
