import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { select, get, observe, add, close } from "../src/utils/strategies";
import { Bloc } from "@bloqz/core";

// Mock React.useMemo since we are using it inside the strategies.
// Wait, renderHook already provides a React environment, so useMemo should work if called inside the hook.
// The strategies are hooks now!

describe("Strategies Hooks", () => {
  it("select returns stable reference with same selector", () => {
    const selector = (state: any) => state.value;
    const { result, rerender } = renderHook(() => select(selector));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("select");
    expect(firstResult.selector).toBe(selector);
  });

  it("select returns new reference with new selector", () => {
    const { result, rerender } = renderHook(
      ({ sel }) => select(sel),
      {
        initialProps: { sel: (state: any) => state.a },
      }
    );

    const firstResult = result.current;

    // Change selector
    rerender({ sel: (state: any) => state.b });
    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
    expect(secondResult.selector).not.toBe(firstResult.selector);
  });

  it("select works with optional selector (default identity)", () => {
    const { result, rerender } = renderHook(() => select());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("select");

    const testState = { foo: "bar" };
    expect(firstResult.selector(testState)).toBe(testState); // Identity check
  });

  it("get returns stable reference with same selector", () => {
    const selector = (bloc: any) => bloc.add;
    const { result, rerender } = renderHook(() => get(selector));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("get");
    expect(firstResult.selector).toBe(selector);
  });

  it("observe returns stable reference with same selector", () => {
    const selector = (state$: any) => state$;
    const { result, rerender } = renderHook(() => observe(selector));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("observe");
    expect(firstResult.selector).toBe(selector);
  });

  it("add returns stable reference", () => {
    const { result, rerender } = renderHook(() => add());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("add");
  });

  it("close returns stable reference", () => {
    const { result, rerender } = renderHook(() => close());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult.type).toBe("close");
  });
});
