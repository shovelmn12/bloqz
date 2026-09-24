import { useRef, useEffect, useReducer, DependencyList } from "./react.js";
import {
  createBloc,
  createPipeBloc,
  Bloc,
  CreateBlocProps,
  CreatePipeBlocProps,
} from "@bloqz/core";

/**
 * A type guard to determine if a props object is for an event-driven Bloc.
 * @internal
 * @param props The props object to check.
 * @returns {boolean} True if the props contain a `handlers` property.
 */
function isCreateBlocProps<Event, State>(
  props: CreateBlocProps<Event, State> | CreatePipeBlocProps<State>
): props is CreateBlocProps<Event, State> {
  return "handlers" in props;
}

/** @internal Creates the right kind of Bloc for the given props. */
function create<Event extends { readonly type: string }, State>(
  props: CreateBlocProps<Event, State> | CreatePipeBlocProps<State>
): Bloc<Event, State> {
  return isCreateBlocProps(props)
    ? createBloc<Event & { type: string }, State>(props)
    : createPipeBloc<Event, State>(props);
}

/** @internal Shallow `Object.is` comparison of two dependency lists. */
function depsEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

const NO_DEPS: DependencyList = [];

type Entry<Event, State> = {
  readonly bloc: Bloc<Event, State>;
  readonly deps: DependencyList;
};

/**
 * A React Hook for creating and managing a Bloc instance within a component's lifecycle.
 *
 * This hook unifies the creation of both event-driven Blocs (using `createBloc`)
 * and stream-driven Blocs (using `createPipeBloc`) into a single function.
 *
 * **Lifecycle**
 * - The Bloc is created **once per component instance** (lazily, on first render)
 *   and is closed exactly once when the component unmounts.
 * - `props` are read **only when the Bloc is created**, the same contract as the
 *   initial value passed to `useState`. Passing a new (e.g. inline) props object on
 *   every render does **not** recreate the Bloc or reset its state; later changes to
 *   `props` are ignored.
 * - To recreate the Bloc when some inputs change, pass them in `deps`. Whenever an
 *   entry of `deps` changes (compared with `Object.is`), the previous Bloc is closed
 *   and a new one is created from the props of that render.
 * - `React.StrictMode` is supported: its simulated unmount/remount closes the first
 *   Bloc and a fresh one is created from the same props, and the component is
 *   re-rendered with it. Consumers therefore never keep a closed Bloc after mount,
 *   but they must not assume the instance returned by the very first render is the
 *   one that stays mounted.
 *
 * @template Event - The type of events the Bloc can process.
 * @template State - The type of state the Bloc manages.
 *
 * @param props The properties used to initialize the Bloc. The hook automatically
 *   detects whether to create an event-driven (`handlers` present) or a
 *   stream-driven (`source$`) Bloc.
 * @param deps Optional dependency list. When any value changes between renders, the
 *   current Bloc is closed and a new one is created. Defaults to `[]` (never recreate).
 *
 * @returns {Bloc<Event, State>} The created and managed Bloc instance.
 *
 * @example
 * // Event-driven Bloc; inline props are fine, they are only read on creation.
 * function MyCounterComponent() {
 *   const counterBloc = useCreateBloc<CounterEvent, CounterState>({
 *     initialState: { count: 0 },
 *     handlers: {
 *       increment: (event, { update }) => update(s => ({ ...s, count: s.count + 1 })),
 *     },
 *   });
 *   // ... use counterBloc
 * }
 *
 * // Stream-driven Bloc (creates a Pipe Bloc)
 * function MyTimerComponent() {
 *   const timerBloc = useCreateBloc<TimerState, unknown>({
 *     source$: interval(1000).pipe(map(i => ({ value: i }))),
 *   });
 *   // ... use timerBloc
 * }
 *
 * // Recreate the Bloc whenever `userId` changes.
 * function UserProfile({ userId }: { userId: string }) {
 *   const bloc = useCreateBloc<UserEvent, UserState>(
 *     { initialState: { userId, user: undefined }, handlers },
 *     [userId]
 *   );
 *   // ...
 * }
 */
export function useCreateBloc<Event, State>(
  props: CreateBlocProps<Event, State>,
  deps?: DependencyList
): Bloc<Event, State>;

export function useCreateBloc<State, Event>(
  props: CreatePipeBlocProps<State>,
  deps?: DependencyList
): Bloc<Event, State>;

export function useCreateBloc<Event extends { readonly type: string }, State>(
  props: CreateBlocProps<Event, State> | CreatePipeBlocProps<State>,
  deps: DependencyList = NO_DEPS
): Bloc<Event, State> {
  const ref = useRef<Entry<Event, State> | null>(null);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // Lazily create the Bloc on first render, or recreate it when `deps` changed.
  // The previous Bloc (if any) is closed by the effect cleanup below.
  if (ref.current === null || !depsEqual(ref.current.deps, deps)) {
    ref.current = { bloc: create<Event, State>(props), deps };
  }

  useEffect(() => {
    let entry = ref.current!;

    // StrictMode runs setup -> cleanup -> setup. The cleanup closed the Bloc,
    // so create a fresh one and re-render so consumers receive the open instance.
    if (entry.bloc.isClosed) {
      entry = ref.current = { bloc: create<Event, State>(props), deps };
      forceRender();
    }

    const bloc = entry.bloc;
    return () => bloc.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref.current.bloc;
}
