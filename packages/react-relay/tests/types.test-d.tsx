import { describe, expectTypeOf, it } from "vitest";
import React from "react";
import { createRelay, Relay, RelayEvent } from "@bloqz/relay";

import {
  RelayProvider,
  RelayProviderProps,
  useRelay,
} from "../src/index.js";

type UserEvent = { type: "login"; userId: string } | { type: "logout" };
type CartEvent = { type: "add"; itemId: string };

interface AppEvents {
  user: UserEvent;
  cart: CartEvent;
}

describe("react-relay types", () => {
  it("useRelay accepts plain interface event maps", () => {
    const relay = useRelay<AppEvents>();
    expectTypeOf(relay).toEqualTypeOf<Relay<AppEvents>>();

    relay.on("user", (event) => {
      expectTypeOf(event).toEqualTypeOf<UserEvent>();
    });
    relay.on("*", (topic, event) => {
      expectTypeOf(topic).toEqualTypeOf<string>();
      expectTypeOf(event).toEqualTypeOf<RelayEvent>();
    });
    // @ts-expect-error payload does not match topic
    relay.emit("cart", { type: "login", userId: "1" });
  });

  it("useRelay defaults to the untyped map", () => {
    expectTypeOf(useRelay()).toEqualTypeOf<Relay>();
  });

  it("RelayProvider accepts a typed create", () => {
    const element = (
      <RelayProvider<AppEvents> create={() => createRelay<AppEvents>()}>
        {null}
      </RelayProvider>
    );
    expectTypeOf(element).toEqualTypeOf<React.JSX.Element>();

    expectTypeOf<RelayProviderProps<AppEvents>["create"]>().toEqualTypeOf<
      (() => Relay<AppEvents>) | undefined
    >();
  });
});
