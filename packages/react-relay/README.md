# @bloqz/react-relay

React bindings for [@bloqz/relay](https://github.com/shovelmn12/bloqz/tree/main/packages/relay), an RxJS-powered event bus. This package provides a React Context Provider and a hook to interact with the event bus within a React application.

## Installation

```sh
npm install @bloqz/react-relay @bloqz/relay
```

Peer dependencies: `react` >= 18 and `@bloqz/relay` ^3.0.0. This package re-exports everything from `@bloqz/relay`.

## Usage

To use `@bloqz/react-relay`, you need to wrap your application or component tree with the `RelayProvider`. This makes the `Relay` instance available to all descendant components.

### 1. Wrap your application with `RelayProvider`

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RelayProvider } from '@bloqz/react-relay';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RelayProvider>
      <App />
    </RelayProvider>
  </React.StrictMode>
);
```

### 2. Subscribe with `useRelayEvent`

`useRelayEvent` subscribes on mount and unsubscribes on unmount. It always calls the latest handler, so the handler does not need to be memoized.

```tsx
import { useRelayEvent } from '@bloqz/react-relay';

function UserLog() {
  useRelayEvent('user', (event) => {
    console.log('User event:', event);
  });

  useRelayEvent('*', (topic, event) => {
    console.log(`Event on ${topic}:`, event);
  });

  return null;
}
```

For a typed event map, pass the map and the topic as type arguments:

```tsx
useRelayEvent<AppEvents, 'user'>('user', (event) => {
  // event: AppEvents['user']
});
```

### 3. Emit with the `useRelay` hook

`useRelay` returns the `Relay` instance, which you can use to emit events or subscribe manually.

```tsx
import { useRelay } from '@bloqz/react-relay';

function LoginButton() {
  const relay = useRelay<AppEvents>();

  return (
    <button onClick={() => relay.emit('user', { type: 'login', userId: 'user-123' })}>
      Log In
    </button>
  );
}
```

## API

### `RelayProvider`

A React component that provides a `Relay` instance to its children via context.

The relay is created once per mount (so an inline `create` is fine) and disposed when the provider unmounts. It is safe under `React.StrictMode`.

**Props**

- `create?: () => Relay`: An optional function that returns a `Relay` instance. If not provided, one is created with `createRelay()`. The provider owns the returned relay and disposes it on unmount, so `create` must return a **new** relay.

#### Sharing a relay

Don't pass a relay that is shared with other providers or with non-React code through `create` (e.g. `create={() => appRelay}`). The first provider to unmount would dispose it for everyone. Provide a shared relay through `RelayContext` instead. `useRelay` and `useRelayEvent` work the same, and the relay is never disposed for you:

```tsx
import { createRelay } from '@bloqz/relay';
import { RelayContext } from '@bloqz/react-relay';

export const appRelay = createRelay<AppEvents>(); // you own it, and you dispose it

<RelayContext.Provider value={appRelay}>
  <App />
</RelayContext.Provider>
```

### `useRelay()`

A React hook that returns the `Relay` instance from the context. It throws `useRelay must be used within a RelayProvider` when there is no `RelayProvider` ancestor.

**Returns**

- `Relay`: The `Relay` event bus instance.

### `useRelayEvent(topic, handler)`

Subscribes `handler` to `topic` (or `'*'` for every event) for the lifetime of the component. The subscription is renewed only when `topic` changes. Must be used within a `RelayProvider`.
