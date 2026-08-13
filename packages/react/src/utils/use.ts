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
import { map, distinctUntilChanged, Observable } from "./stream.js";
import { isEqual } from "lodash-es";

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

  // Whether we are in 'select' mode (reactive state selection).
  const isSelect = strategy?.type === "select";
  const selector = isSelect
    ? (strategy as SelectStrategy<State, T>).selector
    : undefined;

  // Compute the value for non-reactive strategies (and the initial/current
  // value for 'select') synchronously. This is memoized so that 'observe',
  // 'get', 'add', 'close', and the default return stable references as long
  // as the strategy and bloc don't change.
  const snapshot = useMemo(() => {
    if (!strategy) return bloc;
    if (strategy.type === "select") return strategy.selector(bloc.state);
    if (strategy.type === "get") return strategy.selector(bloc);
    if (strategy.type === "observe") return strategy.selector(bloc.state$);
    if (strategy.type === "add") return bloc.add;
    if (strategy.type === "close") return bloc.close;
    return bloc;
  }, [bloc, strategy]);

  // Holds the latest value delivered by the state$ subscription, tagged with
  // the selector that produced it. getSnapshot treats an emission as
  // authoritative only while the current selector matches; when the selector
  // changes, the synchronously-computed `snapshot` reflects the fresh selector
  // instead.
  const emittedRef = useRef<{ selector: typeof selector; value: T } | null>(
    null
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isSelect || !selector) return () => {};

      const subscription = bloc.state$
        .pipe(map(selector), distinctUntilChanged(isEqual))
        .subscribe((val) => {
          emittedRef.current = { selector, value: val };
          onStoreChange();
        });

      return () => subscription.unsubscribe();
    },
    [bloc, selector, isSelect]
  );

  const getSnapshot = useCallback(
    () => {
      const emitted = emittedRef.current;
      return isSelect && emitted && emitted.selector === selector
        ? emitted.value
        : snapshot;
    },
    [isSelect, selector, snapshot]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
