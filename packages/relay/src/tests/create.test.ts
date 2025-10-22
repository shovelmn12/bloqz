import { describe, it, expect, vi } from "vitest";
import { createRelay } from "../create";
import { RelayEvent } from "../models";

describe("createRelay", () => {
  it("should create a new relay", () => {
    const relay = createRelay();
    expect(relay).toBeDefined();
    expect(relay.emit).toBeInstanceOf(Function);
    expect(relay.on).toBeInstanceOf(Function);
    expect(relay.dispose).toBeInstanceOf(Function);
  });

  it("should emit and receive events with string patterns", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("topic.test", handler);
    relay.emit("topic", event);

    expect(handler).toHaveBeenCalledWith("topic", event);
  });

  it("should not receive events that do not match the string pattern", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "other" };

    relay.on("topic.test", handler);
    relay.emit("topic", event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should emit and receive events with predicate functions", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };
    const predicate = (topic: string, e: RelayEvent) =>
      topic === "topic" && e.type === "test";

    relay.on(predicate, handler);
    relay.emit("topic", event);

    expect(handler).toHaveBeenCalledWith("topic", event);
  });

  it("should not receive events that do not match the predicate function", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "other" };
    const predicate = (topic: string, e: RelayEvent) =>
      topic === "topic" && e.type === "test";

    relay.on(predicate, handler);
    relay.emit("topic", event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should unsubscribe an individual listener", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    const unsubscribe = relay.on("topic.test", handler);
    unsubscribe();

    relay.emit("topic", event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should dispose all listeners", () => {
    const relay = createRelay();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("topic.test", handler1);
    relay.on("topic.test", handler2);

    relay.dispose();

    relay.emit("topic", event);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should handle wildcard topic patterns", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event: RelayEvent = { type: "test" };

    relay.on("*.test", handler);
    relay.emit("topic1", event);
    relay.emit("topic2", event);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith("topic1", event);
    expect(handler).toHaveBeenCalledWith("topic2", event);
  });

  it("should handle wildcard event type patterns", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event1: RelayEvent = { type: "test1" };
    const event2: RelayEvent = { type: "test2" };

    relay.on("topic.*", handler);
    relay.emit("topic", event1);
    relay.emit("topic", event2);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith("topic", event1);
    expect(handler).toHaveBeenCalledWith("topic", event2);
  });

  it("should handle multiple event types in pattern", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event1: RelayEvent = { type: "login" };
    const event2: RelayEvent = { type: "logout" };
    const event3: RelayEvent = { type: "other" };

    relay.on("user.{login|logout}", handler);
    relay.emit("user", event1);
    relay.emit("user", event2);
    relay.emit("user", event3);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith("user", event1);
    expect(handler).toHaveBeenCalledWith("user", event2);
  });

  it("should handle multiple patterns", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const event1: RelayEvent = { type: "login" };
    const event2: RelayEvent = { type: "add" };

    relay.on("user.{login|logout}|cart.add", handler);
    relay.emit("user", event1);
    relay.emit("cart", event2);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith("user", event1);
    expect(handler).toHaveBeenCalledWith("cart", event2);
  });
});
