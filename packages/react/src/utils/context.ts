import { createContext, Context } from "./react.js";
import { Bloc } from "@bloqz/core";

/**
 * Creates a React Context object typed for holding a Bloc instance (or `undefined`).
 *
 * A typed wrapper around React's `createContext`, using the provided `bloc` as the
 * context's *default value*. Components consuming this context without a matching
 * Provider above them receive this default value.
 *
 * This is a plain factory, **not** a hook: call it once at module level, like
 * `React.createContext`. The returned context can be passed directly to `useBloc`.
 *
 * @template Event The base union type for all possible events the Bloc can process.
 * @template State The type representing the state managed by the Bloc.
 * @param bloc The optional Bloc instance to use as the default value. Usually
 *   omitted (`undefined`), with the actual instance provided via `<Context.Provider>`.
 * @returns {Context<Bloc<Event, State> | undefined>} A React Context object.
 * @see https://react.dev/reference/react/createContext
 * @example
 * // counter.context.ts
 * import { createBlocContext } from '@bloqz/react';
 * import { CounterEvent, CounterState } from './types';
 *
 * export const CounterContext = createBlocContext<CounterEvent, CounterState>();
 * // Equivalent to:
 * // export const CounterContext = createContext<Bloc<CounterEvent, CounterState> | undefined>(undefined);
 *
 * // In your Provider component:
 * // const counterBloc = useCreateBloc({ ... });
 * // return <CounterContext.Provider value={counterBloc}>...</CounterContext.Provider>;
 *
 * // In a consumer:
 * // const count = useBloc(CounterContext, select(s => s.count));
 */
export function createBlocContext<Event, State>(
  bloc?: Bloc<Event, State>
): Context<Bloc<Event, State> | undefined> {
  return createContext<Bloc<Event, State> | undefined>(bloc);
}
