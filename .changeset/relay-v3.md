---
"@bloqz/relay": major
---

**Breaking:** `Relay` has a new required `readonly isDisposed: boolean`. Hand-written `Relay` implementations (mocks, stubs) must add it.

- After `dispose()`, `emit` and `on` log a `console.warn` and do nothing, and `on` returns a no-op unsubscribe. `dispose()` stays idempotent.
- `on('*', (topic, event) => ...)` now resolves to the wildcard overload. An event-only handler can no longer be registered on `'*'`.
- A subscriber that throws is isolated: other subscribers still receive the event and `emit` never throws. The error goes to the new `createRelay({ onError })` option, or to `console.error` by default.
- Event maps can be plain interfaces: `Relay` and `createRelay` are constrained by the new `RelayEventsMapOf<Events>`. `RelayEventsMap` stays the default. `RelayTopicHandler` and `RelayEventsMapOf` are exported.
- The unused `RelayPredicate` type is deprecated.
- Dropped the unused `@bloqz/core` peer dependency.
