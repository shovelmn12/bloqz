import { Bloc } from "@bloqz/core";
import { Observable } from "./stream.js";

// --- Strategy Types ---

/** Reactive state selection. Created by {@link select}. */
export type SelectStrategy<State, T> = {
  readonly type: "select";
  readonly selector: (state: State) => T;
};

/** Static (non-reactive) access to the Bloc instance. Created by {@link get}. */
export type GetStrategy<Event, State, T> = {
  readonly type: "get";
  readonly selector: (bloc: Bloc<Event, State>) => T;
};

/** Transformation of the Bloc's `state$` stream. Created by {@link observe}. */
export type ObserveStrategy<State, T> = {
  readonly type: "observe";
  readonly selector: (state$: Observable<State>) => Observable<T>;
};

/** Access to the Bloc's `add` method. Created by {@link add}. */
export type AddStrategy = {
  readonly type: "add";
};

/** Access to the Bloc's `close` method. Created by {@link close}. */
export type CloseStrategy = {
  readonly type: "close";
};

// --- Helper Factories ---
//
// These are plain functions, NOT hooks: they have no React state and can be
// called anywhere, including at module scope or conditionally.

const identity = <T>(x: T): T => x;

const IDENTITY_SELECT: SelectStrategy<any, any> = Object.freeze({
  type: "select",
  selector: identity,
});

const ADD: AddStrategy = Object.freeze({ type: "add" });

const CLOSE: CloseStrategy = Object.freeze({ type: "close" });

/**
 * Creates a strategy for selecting a slice of state reactively.
 * The component re-renders whenever the selected value changes (deep equality).
 *
 * This is a plain factory, not a hook. Inline selectors are fine: `useBloc`
 * always uses the latest selector without re-subscribing.
 *
 * @param selector A function that transforms the state into a specific value.
 *   When omitted, a shared identity strategy (select the whole state) is returned.
 */
export function select<State>(
  selector?: undefined
): SelectStrategy<State, State>;
export function select<State, T>(
  selector: (state: State) => T
): SelectStrategy<State, T>;
export function select<State, T>(
  selector?: (state: State) => T
): SelectStrategy<State, T> {
  if (!selector) return IDENTITY_SELECT;
  return Object.freeze({ type: "select", selector });
}

/**
 * Creates a strategy for accessing static properties or methods of the Bloc.
 * This does NOT trigger re-renders when state changes.
 *
 * This is a plain factory, not a hook.
 *
 * @param selector A function that takes the Bloc instance and returns a value (e.g., `bloc => bloc.add`).
 */
export function get<Event, State, T>(
  selector: (bloc: Bloc<Event, State>) => T
): GetStrategy<Event, State, T> {
  return Object.freeze({ type: "get", selector });
}

/**
 * Creates a strategy for transforming the Bloc's state stream.
 * Returns an Observable and does NOT trigger re-renders.
 *
 * This is a plain factory, not a hook. `useBloc` memoizes the resulting
 * Observable on the Bloc and the selector identity, so pass a **stable**
 * selector (module-level function or `useCallback`) to keep the same
 * Observable across renders.
 *
 * @param selector A function that transforms the `state$` Observable (e.g., using `pipe`).
 */
export function observe<State, T>(
  selector: (state$: Observable<State>) => Observable<T>
): ObserveStrategy<State, T> {
  return Object.freeze({ type: "observe", selector });
}

/**
 * Creates a strategy for accessing the `add` method of the Bloc.
 * This is a convenient shortcut for `get(b => b.add)`.
 *
 * Returns a frozen, shared singleton.
 */
export function add(): AddStrategy {
  return ADD;
}

/**
 * Creates a strategy for accessing the `close` method of the Bloc.
 * This is a convenient shortcut for `get(b => b.close)`.
 *
 * Returns a frozen, shared singleton.
 */
export function close(): CloseStrategy {
  return CLOSE;
}
