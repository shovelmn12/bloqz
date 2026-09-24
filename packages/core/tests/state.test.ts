import { describe, it, expect, expectTypeOf } from "vitest";
import { State } from "../src/index.js";
import type { ErrorState, LoadingState } from "../src/index.js";

type User = { name: string };

describe("State helpers", () => {
  it("init creates an init state", () => {
    expect(State.init<User, Error>()).toEqual({ type: "init" });
  });

  it("data creates a data state holding the value", () => {
    const user = { name: "a" };
    expect(State.data<User, Error>(user)).toEqual({ type: "data", value: user });
  });

  it("loading holds the previous value", () => {
    const user = { name: "a" };
    expect(State.loading<User, Error>(user)).toEqual({
      type: "loading",
      value: user,
    });
  });

  it("loading accepts undefined as the previous value by default", () => {
    const s = State.loading<User, Error>(undefined);
    expect(s).toEqual({ type: "loading", value: undefined });
  });

  it("error holds the error and defaults the previous value to undefined", () => {
    const err = new Error("boom");
    const s = State.error<User, Error>(err);
    expect(s).toEqual({ type: "error", error: err, value: undefined });
    expect("value" in s).toBe(true);
  });

  it("error keeps a provided previous value", () => {
    const err = new Error("boom");
    const user = { name: "a" };
    expect(State.error<User, Error>(err, user)).toEqual({
      type: "error",
      error: err,
      value: user,
    });
  });

  it("supports a custom optional representation via the P parameter", () => {
    // e.g. an fp-ts-like Option; any shape the user chooses works.
    type Opt<A> = { _tag: "None" } | { _tag: "Some"; value: A };
    const none: Opt<User> = { _tag: "None" };

    const loading = State.loading<User, Error, Opt<User>>(none);
    const error = State.error<User, Error, Opt<User>>(new Error("x"), none);

    expect(loading).toEqual({ type: "loading", value: none });
    expect(error).toMatchObject({ type: "error", value: none });

    expectTypeOf(loading).toEqualTypeOf<State<User, Error, Opt<User>>>();
    const l = { type: "loading", value: none } as LoadingState<User, Opt<User>>;
    expectTypeOf(l.value).toEqualTypeOf<Opt<User>>();
    const e = State.error<User, Error>(new Error("x")) as ErrorState<User, Error>;
    expectTypeOf(e.value).toEqualTypeOf<User | undefined>();
  });

  it("narrows by discriminator", () => {
    const s: State<User, Error> = State.loading<User, Error>({ name: "a" });
    if (s.type === "loading") {
      expectTypeOf(s.value).toEqualTypeOf<User | undefined>();
      expect(s.value?.name).toBe("a");
    } else {
      throw new Error("expected loading");
    }
  });
});
