# @bloqz/react-relay

React bindings for [@bloqz/relay](https://github.com/shovelmn12/bloqz/tree/main/packages/relay), an RxJS-powered event bus. This package provides a React Context Provider and a hook to interact with the event bus within a React application.

## Installation

```sh
npm install @bloqz/react-relay @bloqz/relay rxjs
```

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

### 2. Access the Relay instance with the `useRelay` hook

You can then use the `useRelay` hook in any component to get access to the `Relay` instance and use it to publish events or subscribe to topics.

```tsx
// src/components/MyComponent.tsx
import { useEffect } from 'react';
import { useRelay } from '@bloqz/react-relay';

function MyComponent() {
  const relay = useRelay();

  useEffect(() => {
    const unsubscribe = relay.on('user', (topic, event) => {
      console.log(`User logged in:`, event);
    });

    return () => {
      unsubscribe();
    };
  }, [relay]);

  const handleLogin = () => {
    relay.emit('user', { type: 'login', userId: 'user-123' });
  };

  return (
    <div>
      <button onClick={handleLogin}>Log In</button>
    </div>
  );
}

export default MyComponent;

```

## API

### `RelayProvider`

A React component that provides the `Relay` instance to its children via context.

**Props**

- `create?: () => Relay`: An optional function that returns a `Relay` instance. If not provided, a default instance is created.

### `useRelay()`

A React hook that returns the `Relay` instance from the context. It must be used within a component that is a descendant of `RelayProvider`.

**Returns**

- `Relay`: The `Relay` event bus instance.
