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
import { map, distinctUntilChanged } from "./stream.js";
import { isEqual } from "lodash";
import { Observable } from "./stream.js"; // Import Observable for type definition

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

  // Determine if we are in 'select' mode (reactive)
  const isSelect = strategy?.type === "select";

  // Memoize the result of the strategy execution (the snapshot).
  // This ensures that for 'observe', 'get', and default, we return a stable reference
  // as long as the strategy (selector) and bloc haven't changed.
  // For 'select', this calculates the *initial* or *current* value synchronously.
  const snapshot = useMemo(() => {
    if (!strategy) return bloc;
    if (strategy.type === "select") return strategy.selector(bloc.state);
    if (strategy.type === "get") return strategy.selector(bloc);
    if (strategy.type === "observe") return strategy.selector(bloc.state$);
    if (strategy.type === "add") return bloc.add;
    if (strategy.type === "close") return bloc.close;
    return bloc;
  }, [bloc, strategy]);

  // Ref to hold the reactive value for 'select' strategy.
  // We initialize it with the memoized snapshot.
  const selectedValueRef = useRef<any>(snapshot);

  // Update the ref if the snapshot (derived from props/state during render) changes.
  // This handles the case where parent props change the selector's output immediately.
  if (isSelect) {
     // We don't necessarily update ref here because useSyncExternalStore will call getSnapshot.
     // But we need to ensure getSnapshot returns the LATEST value if it was updated by subscription.
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isSelect) return () => {};

      // We depend on 'strategy' in useCallback, so if the selector changes (new closure),
      // we re-subscribe. This is the correct React behavior for correctness.
      // If users want to avoid re-subscription, they should memoize the selector passed to `select()`.
      const selector = (strategy as SelectStrategy<State, T>).selector;

      const subscription = bloc.state$
        .pipe(map(selector), distinctUntilChanged(isEqual))
        .subscribe((val) => {
          selectedValueRef.current = val;
          onStoreChange();
        });

      return () => subscription.unsubscribe();
    },
    [bloc, strategy, isSelect] // Added strategy to dependencies to support dynamic selectors
  );

  return useSyncExternalStore(
    subscribe,
    // getSnapshot:
    // If 'select': Return the value from the ref (updated by RxJS) OR the computed snapshot
    // if we haven't subscribed yet? No, useSyncExternalStore handles the flow.
    // Actually, for 'select', we want the value from the ref which tracks the stream.
    // But if props changed and we re-subscribed, we might have a stale ref until next emission?
    // No, 'snapshot' (useMemo) has the latest synchronous value derived from current bloc.state.
    // So if subscription hasn't fired yet, 'snapshot' is correct.
    // However, 'selectedValueRef' tracks the *stream* which might be newer than render cycle?
    // Let's rely on 'selectedValueRef' being updated by subscription.
    // If we re-subscribe, we should probably re-initialize the ref?
    // Actually, simply:
    // For 'select', we want the value that comes from the stream.
    // But initially, or if props change, we compute it from bloc.state (which is 'snapshot').
    // Let's return 'selectedValueRef.current' but ensure it's seeded correctly.

    // Simpler approach for 'select':
    // Just like the original implementation: Ref + Subscription.
    // But we need to handle dynamic selectors.
    // If strategy changes -> re-subscribe -> new value pushed to ref -> onStoreChange -> re-render.
    // The issue in the test was that the component didn't update when props changed.
    // By adding 'strategy' to [bloc, strategy, isSelect], we force re-subscription.
    // This re-runs `map(selector)` on the CURRENT state (BehaviorSubject mimics this?)
    // Wait, `bloc.state$` is a BehaviorSubject (or similar)?
    // If it is, new subscription emits immediately. Ref updates. onStoreChange called. Re-render.
    // Perfect.

    () => (isSelect ? selectedValueRef.current : snapshot),
    () => (isSelect ? selectedValueRef.current : snapshot)
  );
}
