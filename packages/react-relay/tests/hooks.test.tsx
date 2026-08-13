import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { RelayProvider } from "../src/provider.js";
import { useRelay } from "../src/hooks.js";
import { createRelay, Relay } from "@bloqz/relay";
import React, { ReactNode } from "react";

describe("useRelay", () => {
  it("should return the relay instance from the context", () => {
    const relay = createRelay();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RelayProvider create={() => relay}>{children}</RelayProvider>
    );

    const { result } = renderHook(() => useRelay(), { wrapper });

    expect(result.current.emit).toBe(relay.emit);
  });
});