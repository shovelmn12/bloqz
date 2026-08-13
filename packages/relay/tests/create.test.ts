import { describe, it, expect, vi } from "vitest";
import { createRelay } from "../src/create.js";
import { RelayEvent } from "../src/models.js";

describe("createRelay", () => {
  it("should create a new relay", () => {
    const relay = createRelay();
    expect(relay).toBeDefined();
    expect(relay.emit).toBeInstanceOf(Function);
    expect(relay.on).toBeInstanceOf(Function);
    expect(relay.dispose).toBeInstanceOf(Function);
  });

  it("should emit and receive events on a specific topic", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("user", handler);
    relay.emit("user", event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should not receive events from other topics", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("user", handler);
    relay.emit("cart", event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should unsubscribe an individual listener", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    const unsubscribe = relay.on("user", handler);
    unsubscribe();

    relay.emit("user", event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should dispose all listeners", () => {
    const relay = createRelay();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("user", handler1);
    relay.on("user", handler2);

    relay.dispose();

    relay.emit("user", event);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should receive topic and event with '*' subscription", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("*", handler);
    relay.emit("topic", event);

    expect(handler).toHaveBeenCalledWith("topic", event);
  });
});
