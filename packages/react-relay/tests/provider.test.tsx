import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import React, { StrictMode, useEffect, useState } from "react";
import { createRelay, Relay, RelayEvent } from "@bloqz/relay";

import { RelayProvider } from "../src/provider.js";
import { useRelay } from "../src/hooks.js";
import { RelayContext } from "../src/context.js";

const flushMicrotasks = () => act(async () => {});

function Capture({ onRelay }: { onRelay: (relay: Relay) => void }) {
  const relay = useRelay();
  onRelay(relay);
  return null;
}

function Listener({
  topic,
  onEvent,
}: {
  topic: string;
  onEvent: (event: RelayEvent) => void;
}) {
  const relay = useRelay();
  useEffect(() => relay.on(topic, onEvent), [relay, topic, onEvent]);
  return null;
}

describe("RelayProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disposes the relay it created on unmount", async () => {
    const relays: Relay[] = [];
    const create = vi.fn(() => {
      const relay = createRelay();
      relays.push(relay);
      return relay;
    });

    const { unmount } = render(
      <RelayProvider create={create}>
        <Capture onRelay={() => {}} />
      </RelayProvider>,
    );
    await flushMicrotasks();

    expect(relays).toHaveLength(1);
    expect(relays[0].isDisposed).toBe(false);

    unmount();
    await flushMicrotasks();

    expect(relays[0].isDisposed).toBe(true);
  });

  it("disposes the default relay on unmount", async () => {
    let captured: Relay | undefined;
    const { unmount } = render(
      <RelayProvider>
        <Capture onRelay={(relay) => (captured = relay)} />
      </RelayProvider>,
    );
    await flushMicrotasks();
    expect(captured?.isDisposed).toBe(false);

    unmount();
    await flushMicrotasks();
    expect(captured?.isDisposed).toBe(true);
  });

  it("keeps the same relay across re-renders with an inline create", async () => {
    const create = vi.fn(() => createRelay());
    const seen = new Set<Relay>();

    function App({ count }: { count: number }) {
      return (
        // A new `create` function identity on every render.
        <RelayProvider create={() => create()}>
          <Capture onRelay={(relay) => seen.add(relay)} />
          <span>{count}</span>
        </RelayProvider>
      );
    }

    const { rerender } = render(<App count={0} />);
    rerender(<App count={1} />);
    rerender(<App count={2} />);
    await flushMicrotasks();

    expect(create).toHaveBeenCalledTimes(1);
    expect(seen.size).toBe(1);
    expect([...seen][0].isDisposed).toBe(false);
  });

  it("delivers events after mount under StrictMode", async () => {
    const warn = vi.spyOn(console, "warn");
    const onEvent = vi.fn();
    let captured: Relay | undefined;

    render(
      <StrictMode>
        <RelayProvider>
          <Listener topic="user" onEvent={onEvent} />
          <Capture onRelay={(relay) => (captured = relay)} />
        </RelayProvider>
      </StrictMode>,
    );
    await flushMicrotasks();

    expect(captured).toBeDefined();
    expect(captured!.isDisposed).toBe(false);

    act(() => captured!.emit("user", { type: "login" }));

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: "login" });
    // No subscriber ever touched a disposed relay.
    expect(warn).not.toHaveBeenCalled();
  });

  it("never exposes a disposed relay to descendants after mount under StrictMode", async () => {
    const seen: Relay[] = [];

    function Probe() {
      const relay = useRelay();
      const [, setTick] = useState(0);
      useEffect(() => {
        seen.push(relay);
        setTick((t) => t + 1);
      }, [relay]);
      return null;
    }

    const { unmount } = render(
      <StrictMode>
        <RelayProvider>
          <Probe />
        </RelayProvider>
      </StrictMode>,
    );
    await flushMicrotasks();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)!.isDisposed).toBe(false);

    unmount();
    await flushMicrotasks();
    expect(seen.at(-1)!.isDisposed).toBe(true);
  });
});

describe("sharing a relay via RelayContext", () => {
  it("provides the shared relay to useRelay and never disposes it", async () => {
    const shared = createRelay();
    const onEvent = vi.fn();

    const tree = () => (
      <RelayContext.Provider value={shared}>
        <Listener topic="user" onEvent={onEvent} />
      </RelayContext.Provider>
    );
    const first = render(<StrictMode>{tree()}</StrictMode>);
    const second = render(tree());

    first.unmount();
    await flushMicrotasks();

    expect(shared.isDisposed).toBe(false);
    act(() => shared.emit("user", { type: "login" }));
    expect(onEvent).toHaveBeenCalledTimes(1);

    second.unmount();
    await flushMicrotasks();
    expect(shared.isDisposed).toBe(false);
  });
});
