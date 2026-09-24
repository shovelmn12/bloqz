---
"@bloqz/react-relay": major
---

**Breaking:** `useRelay()` throws `Error("useRelay must be used within a RelayProvider")` outside a provider instead of returning a no-op relay that silently dropped every event. `RelayContext` now defaults to `null`.

**Breaking:** `RelayProvider` owns the relay returned by `create`. It calls `create` once per mount, whatever the prop's identity, and disposes the relay on unmount. Disposal is deferred by a microtask so React StrictMode's double effect does not dispose the live relay. Changing `create` after mount no longer creates a new relay.

**Breaking:** declares `react >=18.0.0` as a peer dependency and requires `@bloqz/relay` 3.

- New `useRelayEvent(topic, handler)` hook. It subscribes on mount, unsubscribes on unmount, resubscribes only when the topic or relay changes, and always calls the latest handler. `'*'` is supported.
- `useRelay`, `RelayProvider` and `RelayProviderProps` accept plain interface event maps.
