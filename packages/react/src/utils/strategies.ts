import { Bloc } from "@bloqz/core";
import { Observable } from "./stream.js";

// --- Strategy Types ---

export type SelectStrategy<State, T> = {
  type: "select";
  selector: (state: State) => T;
};

export type GetStrategy<Event, State, T> = {
  type: "get";
  selector: (bloc: Bloc<Event, State>) => T;
};

export type ObserveStrategy<State, T> = {
  type: "observe";
  selector: (state$: Observable<State>) => Observable<T>;
};

export type AddStrategy = {
  type: "add";
};

export type CloseStrategy = {
  type: "close";
};

// --- Helper Factories ---

/**
 * Creates a strategy for selecting a slice of state reactively.
 * The component will re-render whenever the selected value changes.
 *
 * @param selector A function that transforms the state into a specific value.
 */
export function select<State, T>(
  selector: (state: State) => T
): SelectStrategy<State, T> {
  return { type: "select", selector };
}

/**
 * Creates a strategy for accessing static properties or methods of the Bloc.
 * This does NOT trigger re-renders when state changes.
 *
 * @param selector A function that takes the Bloc instance and returns a value (e.g., `bloc => bloc.add`).
 */
export function get<Event, State, T>(
  selector: (bloc: Bloc<Event, State>) => T
): GetStrategy<Event, State, T> {
  return { type: "get", selector };
}

/**
 * Creates a strategy for transforming the Bloc's state stream.
 * Returns an Observable and does NOT trigger re-renders.
 *
 * @param selector A function that transforms the `state$` Observable (e.g., using `pipe`).
 */
export function observe<State, T>(
  selector: (state$: Observable<State>) => Observable<T>
): ObserveStrategy<State, T> {
  return { type: "observe", selector };
}

/**
 * Creates a strategy for accessing the `add` method of the Bloc.
 * This is a convenient shortcut for `get(b => b.add)`.
 */
export function add(): AddStrategy {
  return { type: "add" };
}

/**
 * Creates a strategy for accessing the `close` method of the Bloc.
 * This is a convenient shortcut for `get(b => b.close)`.
 */
export function close(): CloseStrategy {
  return { type: "close" };
}
