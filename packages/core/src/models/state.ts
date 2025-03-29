import { Option, none } from "@/utils/fp"; // Assuming 'Option' and 'none' are from a functional programming utility library

// --- State Definitions ---

/**
 * Represents the initial state before any operation has started.
 */
export type InitState = { readonly type: "init" };

/**
 * Represents the state while an asynchronous operation (e.g., data fetching) is in progress.
 * May optionally hold previous data while loading new data.
 *
 * @template T The type of the data being loaded.
 */
export type LoadingState<T> = {
  /** Discriminator literal type */
  readonly type: "loading";
  /** Optional existing data that might be present while loading. */
  readonly value: Option<T>;
};

/**
 * Represents the state when an asynchronous operation has successfully completed
 * and data is available.
 *
 * @template T The type of the successfully loaded data.
 */
export type DataState<T> = {
  /** Discriminator literal type */
  readonly type: "data";
  /** The successfully loaded data. */
  readonly value: T;
};

/**
 * Represents the state when an asynchronous operation has failed.
 * May optionally hold previous data that was available before the error occurred.
 *
 * @template T The type of the data that was being operated on.
 * @template E The type of the error that occurred.
 */
export type ErrorState<T, E> = {
  /** Discriminator literal type */
  readonly type: "error";
  /** Optional existing data that might be present when the error occurred. */
  readonly value: Option<T>;
  /** The error object or value indicating the failure reason. */
  readonly error: E;
};

/**
 * A union type representing the possible states of an asynchronous operation,
 * typically used for data fetching or processing. It follows a pattern similar
 * to RemoteData or AsyncData structures.
 *
 * @template T The type of the data associated with the operation.
 * @template E The type of the error that might occur during the operation.
 */
export type State<T, E> =
  | InitState
  | LoadingState<T>
  | DataState<T>
  | ErrorState<T, E>;

// --- Factory Methods ---

/**
 * A namespace containing factory functions to create instances of the different asynchronous operation states.
 */
export const State = {
  /**
   * Creates an 'InitState' instance.
   * Represents the state before any operation begins.
   *
   * @template T The type of the potential data.
   * @template E The type of the potential error.
   * @returns {State<T, E>} An object representing the initial state.
   */
  init: <T, E>(): State<T, E> => ({ type: "init" }),

  /**
   * Creates a 'LoadingState' instance.
   * Represents the state during an ongoing operation.
   *
   * @template T The type of the data being loaded.
   * @template E The type of the potential error.
   * @param {Option<T>} value Optional existing data (e.g., stale data being refreshed).
   * @returns {State<T, E>} An object representing the loading state.
   */
  loading: <T, E>(value: Option<T>): State<T, E> => ({
    type: "loading",
    value,
  }),

  /**
   * Creates a 'DataState' instance.
   * Represents the state after a successful operation with the resulting data.
   *
   * @template T The type of the successfully loaded data.
   * @template E The type of the potential error.
   * @param {T} value The successfully loaded data.
   * @returns {State<T, E>} An object representing the success state with data.
   */
  data: <T, E>(value: T): State<T, E> => ({ type: "data", value }),

  /**
   * Creates an 'ErrorState' instance.
   * Represents the state after a failed operation.
   *
   * @template T The type of the data that was being operated on.
   * @template E The type of the error that occurred.
   * @param {E} error The error object or value.
   * @param {Option<T>} [value=none] Optional existing data that might have been present before the error. Defaults to `none`.
   * @returns {State<T, E>} An object representing the error state.
   */
  error: <T, E>(error: E, value: Option<T> = none): State<T, E> => ({
    type: "error",
    error,
    value,
  }),
};
