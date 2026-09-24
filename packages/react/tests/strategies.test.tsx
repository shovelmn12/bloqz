import React, { createContext, FC, PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createBloc, Bloc } from "@bloqz/core";
import { select, get, observe, add, close } from "../src/utils/strategies.js";
import { useBloc } from "../src/index.js";

// Strategies are plain factories, so they can be created at module scope.
type S = { count: number };
type E = { type: "inc" };
const selectCount = select((s: S) => s.count);
const addStrategy = add();

describe("Strategy factories (not hooks)", () => {
  it("can be called outside of a React component", () => {
    expect(() => select()).not.toThrow();
    expect(() => select((s: S) => s.count)).not.toThrow();
    expect(() => get((b: Bloc<E, S>) => b.add)).not.toThrow();
    expect(() => observe((s$) => s$)).not.toThrow();
    expect(() => add()).not.toThrow();
    expect(() => close()).not.toThrow();
  });

  it("select(selector) returns a select strategy with that selector", () => {
    const selector = (state: { value: number }) => state.value;
    const strategy = select(selector);
    expect(strategy.type).toBe("select");
    expect(strategy.selector).toBe(selector);
  });

  it("select() returns a shared identity strategy", () => {
    const a = select();
    const b = select();
    expect(a).toBe(b);
    expect(a.type).toBe("select");
    const testState = { foo: "bar" };
    expect(a.selector(testState)).toBe(testState);
  });

  it("get(selector) returns a get strategy with that selector", () => {
    const selector = (bloc: Bloc<E, S>) => bloc.add;
    const strategy = get(selector);
    expect(strategy.type).toBe("get");
    expect(strategy.selector).toBe(selector);
  });

  it("observe(selector) returns an observe strategy with that selector", () => {
    const selector = <T,>(state$: T) => state$;
    const strategy = observe(selector);
    expect(strategy.type).toBe("observe");
    expect(strategy.selector).toBe(selector);
  });

  it("add() returns a frozen singleton", () => {
    expect(add()).toBe(add());
    expect(add().type).toBe("add");
    expect(Object.isFrozen(add())).toBe(true);
  });

  it("close() returns a frozen singleton", () => {
    expect(close()).toBe(close());
    expect(close().type).toBe("close");
    expect(Object.isFrozen(close())).toBe(true);
  });

  it("works with useBloc when the strategy is created at module scope", async () => {
    const Ctx = createContext<Bloc<E, S> | undefined>(undefined);
    const bloc = createBloc<E, S>({
      initialState: { count: 0 },
      handlers: { inc: (_, { update }) => update((s) => ({ count: s.count + 1 })) },
    });
    const wrapper: FC<PropsWithChildren> = ({ children }) => (
      <Ctx.Provider value={bloc}>{children}</Ctx.Provider>
    );

    const { result } = renderHook(
      () => ({
        count: useBloc(Ctx, selectCount),
        dispatch: useBloc(Ctx, addStrategy),
      }),
      { wrapper }
    );

    expect(result.current.count).toBe(0);
    act(() => result.current.dispatch({ type: "inc" }));
    await waitFor(() => expect(result.current.count).toBe(1));
    bloc.close();
  });
});
