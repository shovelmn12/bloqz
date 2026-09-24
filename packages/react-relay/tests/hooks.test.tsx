import { afterEach, describe, it, expect, vi } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import React, { ReactNode, useEffect } from "react";
import { createRelay, Relay, RelayEvent } from "@bloqz/relay";

import { RelayProvider } from "../src/provider.js";
import { useRelay } from "../src/hooks.js";

describe("useRelay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return the relay instance from the context", () => {
    const relay = createRelay();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RelayProvider create={() => relay}>{children}</RelayProvider>
    );

    const { result } = renderHook(() => useRelay(), { wrapper });

    expect(result.current).toBe(relay);
  });

  it("throws when used outside a RelayProvider", () => {
    // React logs the error thrown during render; keep the output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useRelay())).toThrow(
      "useRelay must be used within a RelayProvider",
    );
  });

  it("delivers an event emitted in one component to a subscriber in another", () => {
    const received = vi.fn();
    let emit: ((event: RelayEvent) => void) | undefined;

    function Emitter() {
      const relay = useRelay();
      emit = (event) => relay.emit("user", event);
      return null;
    }

    function Subscriber() {
      const relay = useRelay();
      useEffect(() => relay.on("user", received), [relay]);
      return null;
    }

    render(
      <RelayProvider>
        <Emitter />
        <Subscriber />
      </RelayProvider>,
    );

    act(() => emit!({ type: "login", userId: "1" }));

    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith({ type: "login", userId: "1" });
  });

  it("isolates separate providers", () => {
    const relays: Relay[] = [];
    function Capture() {
      relays.push(useRelay());
      return null;
    }

    render(
      <>
        <RelayProvider>
          <Capture />
        </RelayProvider>
        <RelayProvider>
          <Capture />
        </RelayProvider>
      </>,
    );

    expect(relays).toHaveLength(2);
    expect(relays[0]).not.toBe(relays[1]);
  });
});
