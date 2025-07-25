import { useRef, useEffect, useMemo } from "./react.js";
import { createBloc, Bloc, CreateBlocProps } from "@bloc/core";

const isDev = process.env.NODE_ENV === "development";

/**
 * A React Hook for creating and managing a Bloc instance within a component's lifecycle.
 *
 * This hook ensures that a Bloc instance is created once for the component and
 * automatically handles its closure when the component unmounts.
 *
 * In `React.StrictMode` development mode, this hook includes specific logic
 * to mitigate the effects of the double-rendering and simulated unmounts that
 * Strict Mode performs, ensuring the Bloc remains functional during development.
 *
 * @template Event - The type of events the Bloc can process. Must extend `{ type: string }`.
 * @template State - The type of state the Bloc manages.
 *
 * @param {CreateBlocProps<Event, State>} props - The properties used to initialize the Bloc.
 * @returns {Bloc<Event, State>} The created and managed Bloc instance.
 *
 * @example
 * ```typescript
 * function MyCounterComponent() {
 *  const bloc = useCreateBloc<CounterBlocEvent, CounterBlocState>({
 *    initialState: { count: 0 },
 *    reducer: (state, event) => {
 *      switch (event.type) {
 *        case "increment":
 *          return { count: state.count + 1 };
 *        case "decrement":
 *          return { count: state.count - 1 };
 *        default:
 *          return state;
 *      }
 *    },
 *  });
 *
 *  // Use the bloc for dispatching events and subscribing to state changes
 *  // (e.g., using another hook like `useBlocState`)
 *
 *  return (
 *    <div>
 *      <p>Count: {bloc.state.count}</p>
 *      <button onClick={() => bloc.add({ type: "increment" })}>Increment</button>
 *    </div>
 *  );
 * }
 *
 * // Use the bloc for dispatching events and subscribing to state changes
 * // (e.g., using another hook like `useBlocState`)
 *
 * return (
 * <div>
 * <p>Count: {bloc.state.count}</p>
 * <button onClick={() => bloc.add({ type: 'increment' })}>Increment</button>
 * </div>
 * );
 * }
 * ```
 */
export function useCreateBloc<Event extends { type: string }, State>(
  props: CreateBlocProps<Event, State>
): Bloc<Event, State> {
  // Memoize the creation of the Bloc instance.
  // This ensures the Bloc is created only when 'props' change,
  // providing a stable reference across renders.
  const bloc = useMemo(() => createBloc<Event, State>(props), [props]);

  // A ref to track if the component has mounted for the first time
  // in development mode, specifically to handle Strict Mode's double invocation.
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
   *
   * @remarks
   * The `[bloc]` dependency ensures that if the Bloc instance itself were to change
   * (e.g., if `useMemo` somehow created a new instance due to `props` changing,
   * though `useMemo` aims for stability), the cleanup function would correctly
   * target the latest Bloc.
   */
  useEffect(() => {
    if (isDev && !didMountRef.current) {
      // In development, on the very first mount (when Strict Mode might run setup-cleanup-setup),
      // we mark that it has mounted and return an empty cleanup function.
      // This prevents the Bloc from being closed during Strict Mode's simulated unmount,
      // which would otherwise break the Bloc's functionality immediately in dev.
      didMountRef.current = true;
      return () => {}; // Return a no-op cleanup for the first simulated unmount
    } else {
      // In production, or on subsequent effect runs in development (after the initial Strict Mode dance),
      // we return the actual bloc.close function to handle proper cleanup when the component unmounts.
      return () => {
        bloc.close();
      };
    }
  }, [bloc]); // Dependency array: Ensures effect re-runs if 'bloc' instance changes.

  // Return the stable Bloc instance for use within the component.
  return bloc;
}
