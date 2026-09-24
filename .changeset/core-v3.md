---
"@bloqz/core": major
---

**Breaking:** `State` no longer depends on fp-ts. `State`, `LoadingState` and `ErrorState` take a third type parameter `P` for the optional previous value, defaulting to `T | undefined` (previously `Option<T>`). `State.error(error, value?)` defaults `value` to `undefined`. fp-ts users can write `State<T, E, Option<T>>`. `fp-ts` is no longer a dependency.

**Breaking:** `Bloc.errors$` emits `{ event: Event | undefined; error }` and `ErrorHandler` is `(error, event: Event | undefined) => void`. Pipeline-level errors are no longer cast to a fake event. `ErrorHandler` is now exported.

**Breaking:** `BlocContext` has a new required `signal: AbortSignal`. Each handler run gets its own `AbortController`. When a transformer drops the run (`restartable()`/`switchMap`, or `close()`), the signal aborts and the run's `update` becomes a no-op, so cancelled runs can no longer overwrite newer state. Errors from aborted runs are not reported.

- A handler that was queued but not yet started when `close()` is called no longer runs.
- `createPipeBloc`: sources that complete or error synchronously (`of(1)`, `EMPTY`, `throwError(...)`) no longer throw a TDZ `ReferenceError` or leave the bloc open. `errors$` is now a real stream that emits source errors as `{ event: undefined, error }` before closing.
- Handlers are looked up with a `Map` keyed by event `type`. Unhandled events are grouped under a `Symbol`, so an event type that equals the old sentinel string is no longer confused with unhandled events.
- Auto-generated bloc IDs use `crypto.randomUUID()` when available, with a longer and collision-resistant fallback.
- The `EMPTY` bloc reports `isClosed: true`.
- Compiled with NodeNext module resolution. The built `dist/index.js` imports cleanly in plain Node ESM (the fp-ts directory import used to fail with `ERR_UNSUPPORTED_DIR_IMPORT`).
