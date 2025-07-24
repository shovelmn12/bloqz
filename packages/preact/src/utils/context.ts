import { createContext, Context } from "./preact.js";
import { Bloc } from "@bloc/core";

/**
 * Creates a React Context object typed specifically for holding a Bloc instance
 * (or `undefined`).
 *
 * This function serves as a typed wrapper around React's `createContext`, initializing
 * the context with the provided `bloc` instance as its default value. Components consuming
 * this context without a matching Provider above them in the tree will receive this
 * default value.
 *
 * **Note on Naming:** The `use` prefix in `createBlocContext` is unconventional for a function
 * that *creates* context. This is **not** a React Hook and should **not** be called
 * conditionally or inside loops like hooks. It's a factory function typically called
 * once at the module level or memoized appropriately. Consider renaming to `createBlocContext`
 * or simply using `React.createContext<Bloc<Event, State> | undefined>(undefined)` directly for clarity.
 *
 * @export
 * @template Event The base union type for all possible events the Bloc can process.
 * @template State The type representing the state managed by the Bloc.
 * @param {Bloc<Event, State> | undefined} bloc The optional Bloc instance to use as the
 *   *default value* for this context. If consumed without a Provider, components will
 *   receive this value. Often initialized with `undefined` or a specific non-functional default
 *   in standard practice, with the actual instance provided via `<Context.Provider>`.
 * @returns {Context<Bloc<Event, State> | undefined>} A React Context object.
 * @see https://react.dev/reference/react/createContext
 * @example
 * // counter.context.ts
 * import { createBlocContext } from '@bloc/react'; // Or wherever this is defined
 * import { CounterEvent, CounterState } from './types';
 *
 * // Create the context, potentially with no default Bloc (or undefined)
 * export const CounterContext = createBlocContext<CounterEvent, CounterState>(undefined);
 * // Or directly:
 * // export const CounterContext = createContext<Bloc<CounterEvent, CounterState> | undefined>(undefined);
 *
 * // In your Provider component:
 * // const counterBloc = useCreateBloc(...); // Create the actual instance
 * // return <CounterContext.Provider value={counterBloc}>...</CounterContext.Provider>;
 */
export function createBlocContext<Event extends { type: string }, State>(
  bloc: Bloc<Event, State> | undefined // Accepts an optional Bloc instance as default
): Context<Bloc<Event, State> | undefined> {
  // Wraps React.createContext, passing the provided bloc as the default value.
  return createContext<Bloc<Event, State> | undefined>(bloc);
}
