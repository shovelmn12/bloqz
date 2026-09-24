import { describe, it, expect, vi, afterEach } from "vitest";
import { concatMap, exhaustMap, mergeMap, switchMap } from "rxjs";
import { createBloc } from "../src/utils/create.js";
import type { EventTransformer } from "../src/index.js";

type SearchEvent = { type: "SEARCH"; query: string; delay: number };

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const restartable = <E>(): EventTransformer<E> => (p) => switchMap(p);
const droppable = <E>(): EventTransformer<E> => (p) => exhaustMap(p);
const sequential = <E>(): EventTransformer<E> => (p) => concatMap(p);
const concurrent = <E>(): EventTransformer<E> => (p) => mergeMap(p);

const createSearchBloc = (
  transformer: EventTransformer<SearchEvent>,
  signals: AbortSignal[] = [],
  log: string[] = []
) =>
  createBloc<SearchEvent, string>({
    initialState: "",
    handlers: {
      SEARCH: {
        transformer,
        handler: async (event, { update, signal }) => {
          signals.push(signal);
          log.push(`start:${event.query}`);
          await sleep(event.delay);
          log.push(`end:${event.query}`);
          update(event.query);
        },
      },
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handler cancellation", () => {
  it("restartable: the superseded slow run cannot overwrite newer state", async () => {
    const bloc = createSearchBloc(restartable());
    bloc.add({ type: "SEARCH", query: "slow", delay: 50 });
    await sleep(1); // let the first run start
    bloc.add({ type: "SEARCH", query: "fast", delay: 5 });

    await sleep(80);
    expect(bloc.state).toBe("fast");
    bloc.close();
  });

  it("restartable: aborts the signal of the superseded run", async () => {
    const signals: AbortSignal[] = [];
    const bloc = createSearchBloc(restartable(), signals);
    bloc.add({ type: "SEARCH", query: "a", delay: 30 });
    await sleep(1);
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });
    await sleep(1);

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await sleep(50);
    expect(bloc.state).toBe("b");
    bloc.close();
  });

  it("sequential: runs one after another and keeps the last value", async () => {
    const log: string[] = [];
    const signals: AbortSignal[] = [];
    const bloc = createSearchBloc(sequential(), signals, log);
    bloc.add({ type: "SEARCH", query: "a", delay: 20 });
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });

    await sleep(60);
    expect(log).toEqual(["start:a", "end:a", "start:b", "end:b"]);
    expect(bloc.state).toBe("b");
    expect(signals.some((s) => s.aborted)).toBe(false);
    bloc.close();
  });

  it("concurrent: every run writes; the slowest finishes last", async () => {
    const states: string[] = [];
    const bloc = createSearchBloc(concurrent());
    bloc.state$.subscribe((s) => states.push(s));
    bloc.add({ type: "SEARCH", query: "slow", delay: 30 });
    bloc.add({ type: "SEARCH", query: "fast", delay: 5 });

    await sleep(60);
    expect(states).toEqual(["", "fast", "slow"]);
    bloc.close();
  });

  it("droppable: drops events while a run is in flight", async () => {
    const log: string[] = [];
    const bloc = createSearchBloc(droppable(), [], log);
    bloc.add({ type: "SEARCH", query: "a", delay: 20 });
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });

    await sleep(40);
    expect(log).toEqual(["start:a", "end:a"]);
    expect(bloc.state).toBe("a");
    bloc.close();
  });

  it("does not report errors of an aborted run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const bloc = createBloc<SearchEvent, string>({
      initialState: "",
      handlers: {
        SEARCH: {
          transformer: restartable(),
          handler: async (event) => {
            await sleep(event.delay);
            throw new Error(`fail:${event.query}`);
          },
        },
      },
      onError,
    });
    bloc.add({ type: "SEARCH", query: "a", delay: 20 });
    await sleep(1);
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });

    await sleep(40);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe("fail:b");
    bloc.close();
  });
});

describe("close() and in-flight / queued handlers", () => {
  it("does not run a handler queued before close()", async () => {
    const handler = vi.fn();
    const bloc = createBloc<SearchEvent, string>({
      initialState: "",
      handlers: { SEARCH: handler },
    });
    bloc.add({ type: "SEARCH", query: "a", delay: 0 });
    bloc.close(); // before the microtask that would start the handler
    await sleep(5);
    expect(handler).not.toHaveBeenCalled();
  });

  it("close() while an async handler is in flight does not throw, and the late update is ignored", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const signals: AbortSignal[] = [];
    const bloc = createSearchBloc(concurrent(), signals);

    bloc.add({ type: "SEARCH", query: "late", delay: 10 });
    await sleep(1);
    expect(() => bloc.close()).not.toThrow();
    expect(signals[0].aborted).toBe(true);

    await sleep(30);
    expect(bloc.state).toBe("");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
