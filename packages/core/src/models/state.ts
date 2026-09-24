// --- State Definitions ---

/**
 * Represents the initial state before any operation has started.
 */
export type InitState = { readonly type: "init" };

/**
 * Represents the state while an asynchronous operation (e.g., data fetching) is in progress.
 * May hold previous data while loading new data.
 *
 * The representation of the "maybe previous value" is chosen by the user via
 * `P`. It defaults to `T | undefined`, but any optional encoding works
 * (e.g. fp-ts `Option<T>`, `T | null`, a custom `Maybe<T>`).
 *
 * @template T The type of the data being loaded.
 * @template P The representation of the (optional) previous value. Defaults to `T | undefined`.
 */
export type LoadingState<T, P = T | undefined> = {
  /** Discriminator literal type */
  readonly type: "loading";
  /** Previously available data (if any), in the representation `P`. */
  readonly value: P;
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
 * May hold previous data that was available before the error occurred.
 *
 * @template T The type of the data that was being operated on.
 * @template E The type of the error that occurred.
 * @template P The representation of the (optional) previous value. Defaults to `T | undefined`.
 */
export type ErrorState<T, E, P = T | undefined> = {
  /** Discriminator literal type */
  readonly type: "error";
  /** Previously available data (if any), in the representation `P`. */
  readonly value: P;
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
 * @template P The representation of the optional "previous value" carried by
 *   `loading` and `error` states. Defaults to `T | undefined`.
 *
 * @example
 * // Default: the previous value is `User | undefined`
 * type UserState = State<User, Err>;
 * const s: UserState = State.loading<User, Err>(undefined);
 *
 * @example
 * // fp-ts users can keep using Option for the previous value:
 * import { Option, none, some } from "fp-ts/lib/Option.js";
 *
 * type UserState = State<User, Err, Option<User>>;
 * const loading: UserState = State.loading<User, Err, Option<User>>(none);
 * const failed: UserState = State.error<User, Err, Option<User>>(err, some(user));
 */
export type State<T, E, P = T | undefined> =
  | InitState
  | LoadingState<T, P>
  | DataState<T>
  | ErrorState<T, E, P>;

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
   * @template P The representation of the optional previous value.
   * @returns {State<T, E, P>} An object representing the initial state.
   */
  init: <T, E, P = T | undefined>(): State<T, E, P> => ({ type: "init" }),

  /**
   * Creates a 'LoadingState' instance.
   * Represents the state during an ongoing operation.
   *
   * @template T The type of the data being loaded.
   * @template E The type of the potential error.
   * @template P The representation of the optional previous value. Defaults to `T | undefined`.
   * @param {P} value The previous data (e.g., stale data being refreshed), in representation `P`.
   * @returns {State<T, E, P>} An object representing the loading state.
   * @example
   * State.loading<User, Err>(undefined);
   * State.loading<User, Err>(previousUser);
   * State.loading<User, Err, Option<User>>(none); // fp-ts
   */
  loading: <T, E, P = T | undefined>(value: P): State<T, E, P> => ({
    type: "loading",
    value,
  }),

  /**
   * Creates a 'DataState' instance.
   * Represents the state after a successful operation with the resulting data.
   *
   * @template T The type of the successfully loaded data.
   * @template E The type of the potential error.
   * @template P The representation of the optional previous value.
   * @param {T} value The successfully loaded data.
   * @returns {State<T, E, P>} An object representing the success state with data.
   */
  data: <T, E, P = T | undefined>(value: T): State<T, E, P> => ({
    type: "data",
    value,
  }),

  /**
   * Creates an 'ErrorState' instance.
   * Represents the state after a failed operation.
   *
   * @template T The type of the data that was being operated on.
   * @template E The type of the error that occurred.
   * @template P The representation of the optional previous value. Defaults to `T | undefined`.
   * @param {E} error The error object or value.
   * @param {P} [value] The previous data, in representation `P`. When omitted, `value` is `undefined`.
   * @returns {State<T, E, P>} An object representing the error state.
   * @example
   * State.error<User, Err>(err);               // value: undefined
   * State.error<User, Err>(err, previousUser); // value: previousUser
   * State.error<User, Err, Option<User>>(err, none); // fp-ts
   */
  error: <T, E, P = T | undefined>(error: E, value?: P): State<T, E, P> => ({
    type: "error",
    error,
    value: value as P,
  }),
};
