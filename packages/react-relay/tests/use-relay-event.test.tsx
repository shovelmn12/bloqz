import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import React, { StrictMode } from "react";
import { Relay, RelayEvent } from "@bloqz/relay";

import { RelayProvider } from "../src/provider.js";
import { useRelay, useRelayEvent } from "../src/index.js";

function Capture({ onRelay }: { onRelay: (relay: Relay) => void }) {
  onRelay(useRelay());
  return null;
}

function Subscriber({
  topic,
  handler,
}: {
  topic: string;
  handler: (event: RelayEvent) => void;
}) {
  useRelayEvent(topic, handler);
  return null;
}

function setup(children: React.ReactNode, strict = false) {
  let relay: Relay | undefined;
  const tree = (content: React.ReactNode) => {
    const inner = (
      <RelayProvider>
        <Capture onRelay={(r) => (relay = r)} />
        {content}
      </RelayProvider>
    );
    return strict ? <StrictMode>{inner}</StrictMode> : inner;
  };
  const utils = render(tree(children));
  return {
    ...utils,
    relay: () => relay!,
    rerenderWith: (content: React.ReactNode) => utils.rerender(tree(content)),
  };
}

describe("useRelayEvent", () => {
  it("subscribes on mount and receives events for its topic only", () => {
    const handler = vi.fn();
    const { relay } = setup(<Subscriber topic="user" handler={handler} />);

    act(() => relay().emit("user", { type: "login" }));
    act(() => relay().emit("cart", { type: "add" }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ type: "login" });
  });

  it("unsubscribes on unmount", () => {
    const handler = vi.fn();
    const { relay, rerenderWith } = setup(
      <Subscriber topic="user" handler={handler} />,
    );

    rerenderWith(null);
    act(() => relay().emit("user", { type: "login" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls the latest handler without resubscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { relay, rerenderWith } = setup(
      <Subscriber topic="user" handler={first} />,
    );
    const on = vi.spyOn(relay(), "on");

    rerenderWith(<Subscriber topic="user" handler={second} />);
    act(() => relay().emit("user", { type: "login" }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(on).not.toHaveBeenCalled();
  });

  it("resubscribes when the topic changes", () => {
    const handler = vi.fn();
    const { relay, rerenderWith } = setup(
      <Subscriber topic="user" handler={handler} />,
    );

    rerenderWith(<Subscriber topic="cart" handler={handler} />);
    act(() => relay().emit("user", { type: "login" }));
    act(() => relay().emit("cart", { type: "add" }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ type: "add" });
  });

  it("supports the '*' wildcard with (topic, event)", () => {
    const handler = vi.fn();
    function Wildcard() {
      useRelayEvent("*", handler);
      return null;
    }
    const { relay } = setup(<Wildcard />);

    act(() => relay().emit("user", { type: "login" }));

    expect(handler).toHaveBeenCalledWith("user", { type: "login" });
  });

  it("receives exactly one delivery per event under StrictMode", () => {
    const handler = vi.fn();
    const { relay } = setup(<Subscriber topic="user" handler={handler} />, true);

    act(() => relay().emit("user", { type: "login" }));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
