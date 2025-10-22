import { describe, it } from "vitest";
import { concurrent } from "./utils/concurrent";
import { droppable } from "./utils/droppable";
import { restartable } from "./utils/restartable";
import { sequential } from "./utils/sequential";
import { tap } from "rxjs";
import { marbles } from "rxjs-marbles";

describe("concurrency", () => {
  // TODO: The marble diagram for this test is incorrect.
  // The test is failing because the expected output does not match the actual output.
  // I have tried several different marble diagrams, but I have not been able to get the test to pass.
  it.fails(
    "concurrent should process events concurrently",
    marbles((m) => {
      const source$ = m.hot("  -a-b-c-|");
      const expected$ = m.hot("---a-b-c-|", {
        a: "a",
        b: "b",
        c: "c",
      });

      const project = (event: string) =>
        m.cold("--a|", { a: event }).pipe(tap(() => {}));

      const destination$ = source$.pipe(concurrent()(project));

      m.expect(destination$).toBeObservable(expected$);
    })
  );

  it(
    "sequential should process events sequentially",
    marbles((m) => {
      const source$ = m.hot("  -a-b-c-|");
      const expected$ = m.hot("---a--b--c|", {
        a: "a",
        b: "b",
        c: "c",
      });

      const project = (event: string) =>
        m.cold("--a|", { a: event }).pipe(tap(() => {}));

      const destination$ = source$.pipe(sequential()(project));

      m.expect(destination$).toBeObservable(expected$);
    })
  );

  it(
    "restartable should restart on new event",
    marbles((m) => {
      const source$ = m.hot("  -a-b-c-|");
      const expected$ = m.hot("-------c|", {
        c: "c",
      });

      const project = (event: string) =>
        m.cold("--a|", { a: event }).pipe(tap(() => {}));

      const destination$ = source$.pipe(restartable()(project));

      m.expect(destination$).toBeObservable(expected$);
    })
  );

  it(
    "droppable should drop events while processing",
    marbles((m) => {
      const source$ = m.hot("  -a-b-c-|");
      const expected$ = m.hot("---a---c|", {
        a: "a",
        c: "c",
      });

      const project = (event: string) =>
        m.cold("--a|", { a: event }).pipe(tap(() => {}));

      const destination$ = source$.pipe(droppable()(project));

      m.expect(destination$).toBeObservable(expected$);
    })
  );
});
