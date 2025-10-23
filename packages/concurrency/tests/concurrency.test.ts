import { describe, it, expect } from "vitest";
import { Subject, firstValueFrom, lastValueFrom, of, timer } from "rxjs";
import { map, scan, toArray, withLatestFrom } from "rxjs/operators";
import { concurrent } from "../src/utils/concurrent.js";
import { droppable } from "../src/utils/droppable.js";
import { restartable } from "../src/utils/restartable.js";
import { sequential } from "../src/utils/sequential.js";

const ASYNC_DELAY = 10;

// Helper function to simulate an async operation with a delay
const delayed = (value, delay = ASYNC_DELAY) =>
  timer(delay).pipe(map(() => value));

describe("Concurrency Operators", () => {
  describe("concurrent", () => {
    it("should process all events in parallel", async () => {
      const source$ = new Subject<number>();
      const project = (value) => delayed(`processed:${value}`);

      const resultsPromise = firstValueFrom(
        source$.pipe(concurrent()(project), toArray())
      );
      source$.next(1);
      source$.next(2);
      source$.next(3);
      source$.complete();

      const results = await resultsPromise;

      // With concurrent, the order is not guaranteed, so we sort them
      expect(results.sort()).toEqual([
        "processed:1",
        "processed:2",
        "processed:3",
      ]);
    });
  });

  describe("droppable", () => {
    it("should drop subsequent events while one is in progress", async () => {
      const source$ = new Subject<number>();
      const project = (value) => delayed(`processed:${value}`, ASYNC_DELAY * 2);

      const resultsPromise = lastValueFrom(
        source$.pipe(
          droppable()(project),
          scan((acc, val) => [...acc, val], [])
        )
      );

      source$.next(1); // Should be processed
      source$.next(2); // Should be dropped
      source$.next(3); // Should be dropped

      setTimeout(() => source$.next(4), ASYNC_DELAY * 3); // Should be processed
      setTimeout(() => source$.complete(), ASYNC_DELAY * 4);

      const results = await resultsPromise;
      expect(results).toEqual(["processed:1", "processed:4"]);
    });
  });

  describe("restartable", () => {
    it("should cancel in-progress events when a new one arrives", async () => {
      const source$ = new Subject<number>();
      const project = (value) => delayed(`processed:${value}`);

      const resultsPromise = firstValueFrom(
        source$.pipe(restartable()(project), toArray())
      );

      source$.next(1);
      source$.next(2);
      source$.next(3); // Only this one should complete
      source$.complete();

      const results = await resultsPromise;
      expect(results).toEqual(["processed:3"]);
    });
  });

  describe("sequential", () => {
    it("should process events one after another in strict order", async () => {
      const source$ = new Subject<number>();
      const project = (value) => delayed(`processed:${value}`);
      const order = [];

      const resultsPromise = firstValueFrom(
        source$.pipe(
          sequential()((val) => {
            order.push(`start:${val}`);
            return project(val).pipe(
              map((res) => {
                order.push(`end:${val}`);
                return res;
              })
            );
          }),
          toArray()
        )
      );

      source$.next(1);
      source$.next(2);
      source$.next(3);
      source$.complete();

      const results = await resultsPromise;
      expect(results).toEqual(["processed:1", "processed:2", "processed:3"]);
      expect(order).toEqual([
        "start:1",
        "end:1",
        "start:2",
        "end:2",
        "start:3",
        "end:3",
      ]);
    });
  });
});
