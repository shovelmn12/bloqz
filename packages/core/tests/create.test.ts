import { describe, it, expect, vi } from "vitest";
import { createBloc, createPipeBloc } from "../src/utils/create.js";
import {
  firstValueFrom,
  skip,
  take,
  BehaviorSubject,
  Subject,
} from "../src/utils/stream.js";
import { Bloc } from "../src/models/index.js";
import { toArray } from "rxjs";

// --- Test Types ---

interface CounterState {
  count: number;
}

type CounterEvent =
  | { type: "INCREMENT"; amount: number }
  | { type: "DECREMENT"; amount: number }
  | { type: "SET"; amount: number }
  | { type: "ERROR" }
  | { type: "UNHANDLED" };

// --- Test Setup ---

const createCounterBloc = (
  initialState: CounterState,
  onError?: (error: unknown, event: CounterEvent) => void
): Bloc<CounterEvent, CounterState> => {
  return createBloc<CounterEvent, CounterState>({
    initialState,
    handlers: {
      INCREMENT: (event, { update }) => {
        update((s) => ({ ...s, count: s.count + event.amount }));
      },
      DECREMENT: (event, { update }) => {
        update((s) => ({ ...s, count: s.count - event.amount }));
      },
      SET: (event, { update }) => {
        update({ count: event.amount });
      },
      ERROR: () => {
        throw new Error("Handler error");
      },
    },
    onError,
  });
};

const nextTick = () => new Promise((res) => setTimeout(res, 0));

// --- Tests ---

describe("createBloc", () => {
  it("should have the correct initial state", () => {
    const initialState: CounterState = { count: 0 };
    const bloc = createCounterBloc(initialState);
    expect(bloc.state).toEqual(initialState);
    bloc.close();
  });

  it("should update state correctly on a single event", async () => {
    const bloc = createCounterBloc({ count: 0 });
    const expectedState: CounterState = { count: 1 };

    const statePromise = firstValueFrom(bloc.state$.pipe(skip(1)));
    bloc.add({ type: "INCREMENT", amount: 1 });

    await expect(statePromise).resolves.toEqual(expectedState);
    bloc.close();
  });

  it("should handle multiple events in sequence", async () => {
    const bloc = createCounterBloc({ count: 0 });
    const events: CounterEvent[] = [
      { type: "INCREMENT", amount: 2 },
      { type: "DECREMENT", amount: 1 },
      { type: "INCREMENT", amount: 3 },
    ];

    const expectedStates: CounterState[] = [
      { count: 2 },
      { count: 1 },
      { count: 4 },
    ];

    const statesPromise = firstValueFrom(
      bloc.state$.pipe(skip(1), take(3), toArray())
    );

    events.forEach(bloc.add);
    const receivedStates = await statesPromise;

    expect(receivedStates).toEqual(expectedStates);
    bloc.close();
  });

  it("should emit errors on the errors$ stream when a handler throws", async () => {
    const bloc = createCounterBloc({ count: 0 });
    const errorEvent: CounterEvent = { type: "ERROR" };

    const errorPromise = firstValueFrom(bloc.errors$);
    bloc.add(errorEvent);

    const { event, error } = await errorPromise;
    expect(event).toBe(errorEvent);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Handler error");
    bloc.close();
  });

  it("should call the global onError callback when a handler throws", async () => {
    const onError = vi.fn();
    const bloc = createCounterBloc({ count: 0 }, onError);
    const errorEvent: CounterEvent = { type: "ERROR" };

    const errorPromise = firstValueFrom(bloc.errors$);
    bloc.add(errorEvent);
    await errorPromise; // Wait for the error to be processed

    expect(onError).toHaveBeenCalledTimes(1);
    const [error, event] = onError.mock.calls[0];
    expect(event).toBe(errorEvent);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Handler error");
    bloc.close();
  });

  it("should not update state when a handler throws", async () => {
    const bloc = createCounterBloc({ count: 10 });
    const initialState = bloc.state;

    const stateUpdateSpy = vi.fn();
    bloc.state$.pipe(skip(1)).subscribe(stateUpdateSpy);

    bloc.add({ type: "ERROR" });
    await nextTick(); // Wait for event to be processed

    expect(stateUpdateSpy).not.toHaveBeenCalled();
    expect(bloc.state).toBe(initialState);
    bloc.close();
  });

  it("should complete the state$ and errors$ streams on close", async () => {
    const bloc = createCounterBloc({ count: 0 });

    const stateCompleted = new Promise<void>((resolve) =>
      bloc.state$.subscribe({ complete: resolve })
    );
    const errorsCompleted = new Promise<void>((resolve) =>
      bloc.errors$.subscribe({ complete: resolve })
    );

    bloc.close();

    await expect(stateCompleted).resolves.toBeUndefined();
    await expect(errorsCompleted).resolves.toBeUndefined();
    expect(bloc.isClosed).toBe(true);
  });

  it("should not process events after being closed", async () => {
    const bloc = createCounterBloc({ count: 0 });
    const stateUpdateSpy = vi.fn();

    bloc.close();
    expect(bloc.isClosed).toBe(true);

    bloc.state$.pipe(skip(1)).subscribe(stateUpdateSpy);
    bloc.add({ type: "INCREMENT", amount: 1 });
    await nextTick();

    expect(stateUpdateSpy).not.toHaveBeenCalled();
    expect(bloc.state.count).toBe(0);
  });

  it("should warn about unhandled events", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const bloc = createCounterBloc({ count: 0 });
    const unhandledEvent: CounterEvent = { type: "UNHANDLED" };

    bloc.add(unhandledEvent);
    await nextTick(); // Wait for the event to be processed

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Bloc: Unhandled event:",
      unhandledEvent
    );

    consoleWarnSpy.mockRestore();
    bloc.close();
  });
});

describe("createPipeBloc", () => {
  it("should receive the initial state from the source observable", async () => {
    const source$ = new BehaviorSubject({ value: "initial" });
    const bloc = createPipeBloc({ source$ });

    expect(bloc.state).toEqual({ value: "initial" });
    bloc.close();
  });

  it("should update its state when the source observable emits a new value", async () => {
    const source$ = new Subject<number>();
    const bloc = createPipeBloc<unknown, number>({
      source$,
      initialState: 0,
    });

    const nextStatePromise = firstValueFrom(bloc.state$.pipe(skip(1)));
    source$.next(1);
    const nextState = await nextStatePromise;

    expect(bloc.state).toBe(1);
    expect(nextState).toBe(1);

    bloc.close();
  });

  it("should complete its state$ stream when the source observable completes", async () => {
    const source$ = new Subject<string>();
    const bloc = createPipeBloc({ source$, initialState: "start" });

    const isComplete = new Promise<boolean>((resolve) => {
      bloc.state$.subscribe({
        complete: () => resolve(true),
      });
    });

    source$.complete();
    await expect(isComplete).resolves.toBe(true);
    expect(bloc.isClosed).toBe(true);
  });

  it("should close itself when the source observable errors", async () => {
    const source$ = new Subject<void>();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const bloc = createPipeBloc({ source$, initialState: undefined });

    const isComplete = new Promise<boolean>((resolve) => {
      bloc.state$.subscribe({
        complete: () => resolve(true),
      });
    });

    const testError = new Error("Test Error");
    source$.error(testError);

    await expect(isComplete).resolves.toBe(true);
    expect(bloc.isClosed).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "PipeBloc: Source stream terminated with an error:",
      testError
    );

    consoleErrorSpy.mockRestore();
  });

  it("should have a no-op add method that warns", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const source$ = new Subject<void>();
    const bloc = createPipeBloc({ source$, initialState: undefined });

    bloc.add({ type: "NO_OP" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Bloc: Attempted to add event to a PipeBloc. Events are not handled by this type of bloc."
    );

    consoleWarnSpy.mockRestore();
    bloc.close();
  });
});
