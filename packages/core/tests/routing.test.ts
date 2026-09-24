import { describe, it, expect, vi, afterEach } from "vitest";
import { createBloc } from "../src/utils/create.js";

const OLD_SENTINEL = " S Y M B O L _ U N H A N D L E D ";

type Ev = { type: typeof OLD_SENTINEL } | { type: "OTHER" } | { type: "A" };

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("event routing", () => {
  it("does not route unhandled events to a handler named like the old sentinel", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sentinelHandler = vi.fn();
    const bloc = createBloc<Ev, number>({
      initialState: 0,
      handlers: { [OLD_SENTINEL]: sentinelHandler },
    });

    bloc.add({ type: "OTHER" });
    await sleep(5);
    expect(sentinelHandler).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Bloc: Unhandled event:", {
      type: "OTHER",
    });

    bloc.add({ type: OLD_SENTINEL });
    await sleep(5);
    expect(sentinelHandler).toHaveBeenCalledTimes(1);
    bloc.close();
  });

  it("routes each event to the handler registered for its type", async () => {
    const a = vi.fn();
    const other = vi.fn();
    const bloc = createBloc<Ev, number>({
      initialState: 0,
      handlers: { A: a, OTHER: other },
    });
    bloc.add({ type: "A" });
    bloc.add({ type: "OTHER" });
    bloc.add({ type: "A" });
    await sleep(5);
    expect(a).toHaveBeenCalledTimes(2);
    expect(other).toHaveBeenCalledTimes(1);
    bloc.close();
  });

  it("does not match inherited object keys as event types", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bloc = createBloc<{ type: string }, number>({
      initialState: 0,
      handlers: {},
    });
    bloc.add({ type: "toString" });
    bloc.add({ type: "__proto__" });
    await sleep(5);
    expect(warn).toHaveBeenCalledTimes(2);
    bloc.close();
  });
});
