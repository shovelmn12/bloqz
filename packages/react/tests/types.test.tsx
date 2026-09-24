import { createContext } from "react";
import { describe, it, expectTypeOf } from "vitest";
import type { Bloc } from "@bloqz/core";
import type { Observable } from "rxjs";
import {
  useBloc,
  createBlocContext,
  select,
  get,
  observe,
  add,
  close,
  type SelectStrategy,
  type GetStrategy,
  type ObserveStrategy,
  type AddStrategy,
  type CloseStrategy,
} from "../src/index.js";

type S = { count: number; name: string };
type E = { type: "inc" } | { type: "rename"; name: string };

const plain = createContext<Bloc<E, S>>(null as unknown as Bloc<E, S>);
const withUndefined = createContext<Bloc<E, S> | undefined>(undefined);
const withNull = createContext<Bloc<E, S> | null>(null);
const withBoth = createContext<Bloc<E, S> | null | undefined>(null);
const fromFactory = createBlocContext<E, S>();

// Type-level only: these functions are never called at runtime.
function checkInference() {
  for (const ctx of [plain, withUndefined, withNull, withBoth, fromFactory] as const) {
    expectTypeOf(useBloc(ctx)).toEqualTypeOf<Bloc<E, S>>();
  }

  expectTypeOf(useBloc(plain)).toEqualTypeOf<Bloc<E, S>>();
  expectTypeOf(useBloc(withUndefined)).toEqualTypeOf<Bloc<E, S>>();
  expectTypeOf(useBloc(withNull)).toEqualTypeOf<Bloc<E, S>>();
  expectTypeOf(useBloc(withBoth)).toEqualTypeOf<Bloc<E, S>>();
  expectTypeOf(useBloc(fromFactory)).toEqualTypeOf<Bloc<E, S>>();

  expectTypeOf(useBloc(withNull, select((s: S) => s.count))).toEqualTypeOf<number>();
  expectTypeOf(useBloc(withUndefined, select((s: S) => ({ n: s.name })))).toEqualTypeOf<{ n: string }>();
  expectTypeOf(useBloc(plain, select<S>())).toEqualTypeOf<S>();

  expectTypeOf(useBloc(withNull, get((b: Bloc<E, S>) => b.state.name))).toEqualTypeOf<string>();
  expectTypeOf(
    useBloc(withUndefined, observe((s$: Observable<S>) => s$))
  ).toEqualTypeOf<Observable<S>>();

  expectTypeOf(useBloc(withNull, add())).toEqualTypeOf<(event: E) => void>();
  expectTypeOf(useBloc(withUndefined, close())).toEqualTypeOf<() => void>();

  // @ts-expect-error selector state type must match the context's State.
  useBloc(withNull, select((s: { other: boolean }) => s.other));
}

describe("types", () => {
  it("exports strategy types", () => {
    expectTypeOf(select((s: S) => s.count)).toEqualTypeOf<SelectStrategy<S, number>>();
    expectTypeOf(get((b: Bloc<E, S>) => b.id)).toEqualTypeOf<GetStrategy<E, S, string>>();
    expectTypeOf(observe((s$: Observable<S>) => s$)).toEqualTypeOf<ObserveStrategy<S, S>>();
    expectTypeOf(add()).toEqualTypeOf<AddStrategy>();
    expectTypeOf(close()).toEqualTypeOf<CloseStrategy>();
    expectTypeOf(checkInference).toBeFunction();
  });
});
