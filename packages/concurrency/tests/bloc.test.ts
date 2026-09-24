import { describe, it, expect } from "vitest";
import { createBloc, type EventTransformer } from "@bloqz/core";
import { concurrent } from "../src/utils/concurrent.js";
import { droppable } from "../src/utils/droppable.js";
import { restartable } from "../src/utils/restartable.js";
import { sequential } from "../src/utils/sequential.js";

type SearchEvent = { type: "SEARCH"; query: string; delay: number };

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const setup = (transformer: EventTransformer<SearchEvent>) => {
  const log: string[] = [];
  const signals: AbortSignal[] = [];
  const states: string[] = [];
  const bloc = createBloc<SearchEvent, string>({
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
  bloc.state$.subscribe((s) => states.push(s));
  return { bloc, log, signals, states };
};

describe("transformers with createBloc", () => {
  it("restartable: ends on the latest value even if an older run is slower", async () => {
    const { bloc, states } = setup(restartable());
    bloc.add({ type: "SEARCH", query: "slow", delay: 50 });
    await sleep(1);
    bloc.add({ type: "SEARCH", query: "fast", delay: 5 });

    await sleep(80);
    expect(bloc.state).toBe("fast");
    expect(states).toEqual(["", "fast"]);
    bloc.close();
  });

  it("restartable: aborts the superseded run's signal", async () => {
    const { bloc, signals } = setup(restartable());
    bloc.add({ type: "SEARCH", query: "a", delay: 30 });
    await sleep(1);
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });
    await sleep(1);

    expect(signals.map((s) => s.aborted)).toEqual([true, false]);
    await sleep(40);
    expect(signals[1].aborted).toBe(false);
    bloc.close();
  });

  it("sequential: processes runs in order without aborting", async () => {
    const { bloc, log, signals, states } = setup(sequential());
    bloc.add({ type: "SEARCH", query: "a", delay: 20 });
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });

    await sleep(60);
    expect(log).toEqual(["start:a", "end:a", "start:b", "end:b"]);
    expect(states).toEqual(["", "a", "b"]);
    expect(signals.map((s) => s.aborted)).toEqual([false, false]);
    bloc.close();
  });

  it("concurrent: runs in parallel and every run writes", async () => {
    const { bloc, log, states } = setup(concurrent());
    bloc.add({ type: "SEARCH", query: "slow", delay: 30 });
    bloc.add({ type: "SEARCH", query: "fast", delay: 5 });

    await sleep(60);
    expect(log).toEqual(["start:slow", "start:fast", "end:fast", "end:slow"]);
    expect(states).toEqual(["", "fast", "slow"]);
    bloc.close();
  });

  it("droppable: ignores events while a run is in flight", async () => {
    const { bloc, log, states } = setup(droppable());
    bloc.add({ type: "SEARCH", query: "a", delay: 20 });
    bloc.add({ type: "SEARCH", query: "b", delay: 5 });

    await sleep(40);
    expect(log).toEqual(["start:a", "end:a"]);
    expect(states).toEqual(["", "a"]);

    bloc.add({ type: "SEARCH", query: "c", delay: 5 });
    await sleep(20);
    expect(bloc.state).toBe("c");
    bloc.close();
  });
});
