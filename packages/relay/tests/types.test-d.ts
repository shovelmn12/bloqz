import { describe, expectTypeOf, it } from "vitest";
import { createRelay } from "../src/create.js";
import type { Relay, RelayEvent } from "../src/index.js";

type UserEvent = { type: "login"; userId: string } | { type: "logout" };
type CartEvent = { type: "add"; itemId: string };

type AppEventsType = {
  user: UserEvent;
  cart: CartEvent;
};

interface AppEventsInterface {
  user: UserEvent;
  cart: CartEvent;
}

describe("Relay types", () => {
  it("types the '*' wildcard callback as (topic, event)", () => {
    const relay = createRelay<AppEventsType>();

    relay.on("*", (topic, event) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
      expectTypeOf(event).toEqualTypeOf<RelayEvent>();
    });
  });

  it("resolves '*' to the wildcard overload even for index-signature maps", () => {
    const relay = createRelay();

    // A single-parameter callback must still receive the topic, not the event.
    relay.on("*", (topic) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
    });

    type IndexedEvents = { [topic: string]: RelayEvent; user: UserEvent };
    const indexed = createRelay<IndexedEvents>();
    indexed.on("*", (topic) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
    });
    indexed.on("user", (event) => {
      expectTypeOf(event).toEqualTypeOf<UserEvent>();
    });

    // An event-only handler is wrong for '*' (it would receive the topic as
    // its first argument at runtime) and must not type-check.
    const eventOnly = (event: RelayEvent) => void event;
    // @ts-expect-error '*' handlers receive (topic, event)
    relay.on("*", eventOnly);
    // @ts-expect-error '*' handlers receive (topic, event)
    indexed.on("*", eventOnly);
  });

  it("types a topic callback with the precise event type", () => {
    const relay = createRelay<AppEventsType>();

    relay.on("user", (event) => {
      expectTypeOf(event).toEqualTypeOf<UserEvent>();
    });
    relay.on("cart", (event) => {
      expectTypeOf(event).toEqualTypeOf<CartEvent>();
    });
  });

  it("rejects unknown topics and mismatched payloads", () => {
    const relay = createRelay<AppEventsType>();

    // @ts-expect-error unknown topic
    relay.on("nope", () => {});
    // @ts-expect-error payload does not match topic
    relay.emit("user", { type: "add", itemId: "1" });
    relay.emit("user", { type: "login", userId: "1" });
  });

  it("accepts plain interfaces as event maps", () => {
    const relay = createRelay<AppEventsInterface>();
    expectTypeOf(relay).toEqualTypeOf<Relay<AppEventsInterface>>();

    relay.on("user", (event) => {
      expectTypeOf(event).toEqualTypeOf<UserEvent>();
    });
    relay.on("*", (topic, event) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
      expectTypeOf(event).toEqualTypeOf<RelayEvent>();
    });
    relay.emit("cart", { type: "add", itemId: "1" });
  });

  it("rejects event maps whose values are not RelayEvents", () => {
    interface BadEvents {
      user: { notType: string };
    }
    // @ts-expect-error values must be RelayEvent-shaped
    createRelay<BadEvents>();
  });

  it("keeps the untyped default usable", () => {
    const relay = createRelay();
    relay.on("anything", (event) => {
      expectTypeOf(event).toEqualTypeOf<RelayEvent>();
    });
    relay.on("*", (topic, event) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
      expectTypeOf(event).toEqualTypeOf<RelayEvent>();
    });
    relay.emit("anything", { type: "x" });
  });

  it("exposes isDisposed and accepts an onError option", () => {
    const relay = createRelay<AppEventsType>({
      onError: (error, context) => {
        expectTypeOf(error).toEqualTypeOf<unknown>();
        expectTypeOf(context.topic).toEqualTypeOf<string>();
        expectTypeOf(context.event).toEqualTypeOf<RelayEvent>();
      },
    });
    expectTypeOf(relay.isDisposed).toEqualTypeOf<boolean>();
  });
});
