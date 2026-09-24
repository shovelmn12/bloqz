import {
  useContext,
  Context,
  useSyncExternalStore,
  useCallback,
  useRef,
  useMemo,
} from "./react.js";
import { Bloc } from "@bloqz/core";
import {
  SelectStrategy,
  GetStrategy,
  ObserveStrategy,
  AddStrategy,
  CloseStrategy,
} from "./strategies.js";
import { Observable } from "./stream.js";
import { isEqual } from "lodash-es";

const noop = () => {};

/**
 * A versatile React Hook for consuming a Bloc from Context.
 * It supports retrieving the full Bloc, selecting reactive state, accessing static members,
 * or transforming the state stream using strategy helpers.
 *
 * @see {@link select} for reactive state selection.
 * @see {@link get} for static access (no re-renders).
 * @see {@link observe} for stream transformation (returns Observable).
 * @see {@link add} for getting the add method.
 * @see {@link close} for getting the close method.
 */

// Overload 1: Default (Return Bloc)
export function useBloc<Event, State>(
  context: Context<Bloc<Event, State>>
): Bloc<Event, State>;

// Overload 2: Reactive State Selection
export function useBloc<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  strategy: SelectStrategy<State, T>
): T;

// Overload 3: Static Access
export function useBloc<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  strategy: GetStrategy<Event, State, T>
): T;

// Overload 4: Stream Transformation
export function useBloc<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  strategy: ObserveStrategy<State, T>
): Observable<T>;

// Overload 5: Add Method
export function useBloc<Event, State>(
  context: Context<Bloc<Event, State>>,
  strategy: AddStrategy
): (event: Event) => void;

// Overload 6: Close Method
export function useBloc<Event, State>(
  context: Context<Bloc<Event, State>>,
  strategy: CloseStrategy
): () => void;

// Implementation
export function useBloc<Event, State, T>(
  context: Context<Bloc<Event, State>>,
  strategy?:
    | SelectStrategy<State, T>
    | GetStrategy<Event, State, T>
    | ObserveStrategy<State, T>
    | AddStrategy
    | CloseStrategy
):
  | T
  | Observable<T>
  | Bloc<Event, State>
  | ((event: Event) => void)
  | (() => void) {
  const bloc = useContext(context);

  if (!bloc) {
    throw new Error("useBloc must be used within a BlocContext.Provider");
  }

  // --- Reactive path ('select') ---
  //
  // `subscribe` depends only on the bloc and on whether we are selecting, so an
  // inline selector (new identity every render) never causes a re-subscribe.
  // The selector itself is only used by `getSnapshot`, which React always calls
  // in its latest version, so selector changes are reflected on the next render.
  //
  // `getSnapshot` caches the last selected value and returns the SAME reference
  // while the new selection is deeply equal (lodash `isEqual`). This keeps it
  // referentially stable, which is what prevents render loops with
  // object-returning selectors such as `s => ({ a: s.a })`.
  const isSelect = strategy?.type === "select";
  const selector = isSelect
    ? (strategy as SelectStrategy<State, T>).selector
    : undefined;

  const cacheRef = useRef<{ value: T } | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isSelect) return noop;
      const subscription = bloc.state$.subscribe(() => onStoreChange());
      return () => subscription.unsubscribe();
    },
    [bloc, isSelect]
  );

  const getSnapshot = useCallback((): T | undefined => {
    if (!selector) return undefined;
    const next = selector(bloc.state);
    const cached = cacheRef.current;
    if (cached && isEqual(cached.value, next)) return cached.value;
    cacheRef.current = { value: next };
    return next;
  }, [bloc, selector]);

  // Always called (rules of hooks); for non-'select' strategies `subscribe` is a
  // no-op and `getSnapshot` returns a constant `undefined`.
  const selected = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // --- Non-reactive paths ---
  //
  // Memoized on the bloc, the strategy type and its selector (not the strategy
  // object, which is a fresh object per `get(...)`/`observe(...)` call). Pass a
  // stable selector to `observe` to get the same Observable across renders.
  const type = strategy?.type;
  const strategySelector =
    strategy && "selector" in strategy ? strategy.selector : undefined;

  const value = useMemo(() => {
    switch (type) {
      case undefined:
        return bloc;
      case "get":
        return (strategySelector as GetStrategy<Event, State, T>["selector"])(
          bloc
        );
      case "observe":
        return (
          strategySelector as ObserveStrategy<State, T>["selector"]
        )(bloc.state$);
      case "add":
        return bloc.add;
      case "close":
        return bloc.close;
      default:
        return undefined;
    }
  }, [bloc, type, strategySelector]);

  return isSelect ? (selected as T) : value!;
}
