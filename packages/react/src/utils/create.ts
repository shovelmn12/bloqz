import { useRef, useEffect, useMemo } from "./react.js";
import {
  createBloc,
  createPipeBloc,
  Bloc,
  CreateBlocProps,
  CreatePipeBlocProps,
} from "@bloqz/core";

const isDev = process.env.NODE_ENV === "development";

/**
 * A type guard to determine if a props object is for an event-driven Bloc.
 * @internal
 * @param props The props object to check.
 * @returns {boolean} True if the props contain a `handlers` property.
 */
function isCreateBlocProps<Event, State>(
  props: CreateBlocProps<Event, State> | CreatePipeBlocProps<Event, State>
): props is CreateBlocProps<Event, State> {
  return "handlers" in props;
}

/**
 * A React Hook for creating and managing a Bloc instance within a component's lifecycle.
 *
 * This hook unifies the creation of both event-driven Blocs (using `createBloc`)
 * and stream-driven Blocs (using `createPipeBloc`) into a single function.
 *
 * It ensures that a Bloc instance is created once for the component and
 * automatically handles its closure when the component unmounts.
 *
 * @template Event - The type of events the Bloc can process.
 * @template State - The type of state the Bloc manages.
 *
 * @param {CreateBlocProps<Event, State> | CreatePipeBlocProps<State, Event>} props
 * The properties used to initialize the Bloc. The hook automatically detects
 * whether to create an event-driven or stream-driven Bloc based on the props.
 *
 * @returns {Bloc<Event, State>} The created and managed Bloc instance.
 *
 * @example
 * // Example using event-driven props (creates a standard Bloc)
 * function MyCounterComponent() {
 * const counterBloc = useCreateBloc<CounterEvent, CounterState>({
 * initialState: { count: 0 },
 * handlers: {
 * increment: (event, { update }) => update(s => ({ ...s, count: s.count + 1 })),
 * },
 * });
 * // ... use counterBloc
 * }
 *
 * // Example using stream-driven props (creates a Pipe Bloc)
 * function MyTimerComponent() {
 * const timerBloc = useCreateBloc<TimerState, unknown>({
 * source$: interval(1000).pipe(map(i => ({ value: i }))),
 * });
 * // ... use timerBloc
 * }
 */
export function useCreateBloc<Event, State>(
  props: CreateBlocProps<Event, State>
): Bloc<Event, State>;

export function useCreateBloc<State, Event>(
  props: CreatePipeBlocProps<Event, State>
): Bloc<Event, State>;

export function useCreateBloc<Event extends { readonly type: string }, State>(
  props: CreateBlocProps<Event, State> | CreatePipeBlocProps<Event, State>
): Bloc<Event, State> {
  // Memoize the creation of the Bloc instance.
  // We use a factory function inside useMemo to dynamically create the correct
  // type of Bloc based on the provided props.
  const bloc = useMemo(() => {
    // Check if the props are for a standard Bloc by looking for the 'handlers' property.
    if (isCreateBlocProps(props)) {
      // Create a standard Bloc for handling events.
      return createBloc<Event & { type: string }, State>(props);
    } else {
      // Otherwise, create a Pipe Bloc for piping a stream.
      return createPipeBloc<Event, State>(props);
    }
  }, [props]); // The dependency array ensures a new Bloc is created only if props change.

  // A ref to track if the component has mounted for the first time.
  // This is specifically to handle React.StrictMode's double invocation in development.
  const didMountRef = useRef(false);

  /**
   * Effect hook to manage the Bloc's lifecycle (cleanup).
   *
   * In development (`isDev` is true) and within `React.StrictMode`, `useEffect`
   * runs its setup, then its cleanup, then its setup again.
   *
   * The `didMountRef` is used to skip the cleanup during the *first* simulated
   * unmount in development. This prevents the Bloc from being prematurely closed
   * and breaking the development experience, while still allowing actual cleanup
   * on component unmount in production or the final cleanup in development.
   */
  useEffect(() => {
    if (isDev && !didMountRef.current) {
      // In development, on the very first mount (when Strict Mode might run setup-cleanup-setup),
      // we mark that it has mounted and return an empty cleanup function.
      didMountRef.current = true;
      return () => {};
    } else {
      // In production, or on subsequent effect runs in development,
      // we return the actual `bloc.close` function to handle proper cleanup when the component unmounts.
      return () => {
        bloc.close();
      };
    }
  }, [bloc]);

  // Return the stable Bloc instance for use within the component.
  return bloc;
}
