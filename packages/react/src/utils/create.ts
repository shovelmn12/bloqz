import { useRef, useEffect } from "./react.js";
import { createBloc, Bloc, CreateBlocProps } from "@bloc/core";

/**
 * @template Event The type of events that the Bloc can receive. Must have a 'type' property.
 * @template State The type of the state that the Bloc holds.
 *
 * @param {CreateBlocProps<Event, State>} initialProps The initial properties to create the Bloc.
 * @returns {Bloc<Event, State>} The created Bloc instance.
 *
 * @description
 * A React hook that creates and manages the lifecycle of a Bloc instance.
 * It ensures that the Bloc is created only once per component instance and is
 * properly closed when the component unmounts.
 *
 * This hook is designed to work correctly with React's Strict Mode, which
 * can cause components to render twice in development to detect potential problems.
 * It uses a ref to track the mounted state and prevent the Bloc from being
 * prematurely closed during the initial double-render cycle of Strict Mode.
 */
export function useCreateBloc<Event extends { type: string }, State>(
  props: CreateBlocProps<Event, State>
): Bloc<Event, State> {
  const blocRef = useRef<Bloc<Event, State> | null>(null);
  // This ref acts as a flag to track if the component has mounted for the "first real time"
  // (i.e., after Strict Mode's initial double-render cycle).
  const didMountRef = useRef(false);

  // 1. Bloc Creation (Runs only once per component instance)
  if (blocRef.current === null) {
    blocRef.current = createBloc<Event, State>(props);
  }

  // 2. Effect for Cleanup (Handles Strict Mode's double-invocation)
  useEffect(() => {
    const currentBloc = blocRef.current!; // Guaranteed to be non-null here

    // This block runs on the *first* invocation of the effect after mount.
    // In Strict Mode, this is the "simulated mount."
    if (!didMountRef.current) {
      didMountRef.current = true; // Mark that we've passed the initial mount phase

      // Return a cleanup function for the first pass.
      // In Strict Mode, this cleanup is called immediately.
      // We explicitly do *not* close the bloc here.
      return () => {
        // No action here. The actual close happens in the *next* cleanup.
      };
    } else {
      // This block runs on the *second* invocation of the effect after mount (in Strict Mode),
      // or the single invocation in a production environment.

      // Return the cleanup function that should *actually* close the bloc.
      return () => {
        currentBloc.close(); // This is the only time the bloc is truly closed by this hook.
        blocRef.current = null; // Optional: Clear the ref on final unmount
      };
    }
  }, []); // Empty dependency array: ensures this effect runs once per component instance.

  return blocRef.current!;
}
