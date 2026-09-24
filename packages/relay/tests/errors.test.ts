import { afterEach, describe, expect, it, vi } from "vitest";
import { createRelay } from "../src/create.js";

const flushMacrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createRelay error isolation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is callable with no arguments and with an empty options object", () => {
    expect(() => createRelay()).not.toThrow();
    expect(() => createRelay({})).not.toThrow();
  });

  it("keeps delivering to other listeners when one throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const relay = createRelay();
    const before = vi.fn();
    const after = vi.fn();
    const wildcard = vi.fn();

    relay.on("user", before);
    relay.on("user", () => {
      throw new Error("boom");
    });
    relay.on("user", after);
    relay.on("*", wildcard);

    const event = { type: "login" };
    expect(() => relay.emit("user", event)).not.toThrow();
    expect(() => relay.emit("user", event)).not.toThrow();

    expect(before).toHaveBeenCalledTimes(2);
    expect(after).toHaveBeenCalledTimes(2);
    expect(wildcard).toHaveBeenCalledTimes(2);
    expect(wildcard).toHaveBeenCalledWith("user", event);

    // The throwing listener must stay subscribed and must not break the relay.
    expect(consoleError).toHaveBeenCalledTimes(2);

    // No asynchronous rethrow (RxJS reportUnhandledError uses setTimeout).
    await flushMacrotasks();
  });

  it("falls back to console.error when no onError is given", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const relay = createRelay();
    const error = new Error("boom");
    relay.on("*", () => {
      throw error;
    });

    relay.emit("cart", { type: "add" });
    await flushMacrotasks();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]).toContain(error);
  });

  it("routes subscriber errors to onError with topic and event context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const relay = createRelay({ onError });
    const error = new Error("boom");
    const other = vi.fn();

    relay.on("user", () => {
      throw error;
    });
    relay.on("user", other);

    const event = { type: "login", userId: "1" };
    relay.emit("user", event);
    await flushMacrotasks();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error, { topic: "user", event });
    expect(other).toHaveBeenCalledWith(event);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("routes wildcard subscriber errors to onError", () => {
    const onError = vi.fn();
    const relay = createRelay({ onError });
    relay.on("*", () => {
      throw "not an Error";
    });

    const event = { type: "x" };
    relay.emit("anything", event);

    expect(onError).toHaveBeenCalledWith("not an Error", {
      topic: "anything",
      event,
    });
  });

  it("does not let a throwing onError escape emit", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const relay = createRelay({
      onError: () => {
        throw new Error("onError failed");
      },
    });
    const other = vi.fn();
    relay.on("user", () => {
      throw new Error("boom");
    });
    relay.on("user", other);

    expect(() => relay.emit("user", { type: "x" })).not.toThrow();
    await flushMacrotasks();

    expect(other).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("createRelay delivery order", () => {
  it("delivers synchronously in subscription order across topic and wildcard listeners", () => {
    const relay = createRelay();
    const calls: string[] = [];

    relay.on("user", () => calls.push("user-1"));
    relay.on("*", () => calls.push("wild-1"));
    relay.on("user", () => calls.push("user-2"));
    relay.on("cart", () => calls.push("cart-1"));
    relay.on("*", () => calls.push("wild-2"));

    relay.emit("user", { type: "x" });
    expect(calls).toEqual(["user-1", "wild-1", "user-2", "wild-2"]);
  });

  it("supports subscribing the same callback twice", () => {
    const relay = createRelay();
    const handler = vi.fn();
    const off1 = relay.on("user", handler);
    relay.on("user", handler);

    relay.emit("user", { type: "x" });
    expect(handler).toHaveBeenCalledTimes(2);

    off1();
    relay.emit("user", { type: "x" });
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("does not deliver the current event to listeners added during emit", () => {
    const relay = createRelay();
    const late = vi.fn();
    relay.on("user", () => {
      relay.on("user", late);
    });

    relay.emit("user", { type: "x" });
    expect(late).not.toHaveBeenCalled();
  });

  it("does not deliver to listeners removed earlier in the same emit", () => {
    const relay = createRelay();
    const second = vi.fn();
    let offSecond = () => {};
    relay.on("user", () => offSecond());
    offSecond = relay.on("user", second);

    relay.emit("user", { type: "x" });
    expect(second).not.toHaveBeenCalled();
  });
});
