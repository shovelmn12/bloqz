# @bloqz/react

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40bloqz%2Freact.svg)](https://badge.fury.io/js/%40bloqz%2Freact)
<!-- Add other relevant badges: build status, etc. -->

React integration layer for the functional BLoC pattern library (`@bloqz/core`). Provides hooks and utilities to easily connect your React components to BLoC instances for state management.

## Purpose

This package bridges the gap between your BLoC business logic (managed using `@bloqz/core`) and your React UI components. It leverages React Context and a versatile custom hook (`useBloc`) for efficient, reactive, and concurrent-mode-safe state consumption and Bloc lifecycle management within React.

## Features

*   **`useCreateBloc`**: Hook to create and memoize a stable BLoC instance within a component's lifecycle, automatically handling cleanup (`bloc.close()`).
*   **`useBloc`**: The unified hook for all Bloc interactions.
    *   **Access Bloc**: Get the full Bloc instance.
    *   **Reactive State**: Select parts of the state with efficient re-renders using the `select` strategy.
    *   **Static Access**: Get static values or methods without subscriptions using the `get` strategy.
    *   **Stream Access**: Transform and consume the underlying state stream using the `observe` strategy.
*   **Strategy Helpers**: `select`, `get`, `observe`, `add`, and `close` helpers to define how you want to consume the Bloc.
*   **Type-Safe**: Leverages the strong typing of `@bloqz/core` and TypeScript.
*   **Concurrent Mode Ready**: Uses `useSyncExternalStore` for reactive state selection.

## Installation

```bash
# Using npm
npm install @bloqz/react

# Using yarn
yarn add @bloqz/react
```

## Peer Dependencies

This package relies on the following peer dependencies, which you need to have installed in your project:

*   `react`: Version 18.0.0 or later (due to `useSyncExternalStore` and `use` hook usage).
*   `@bloqz/core`: The core BLoC implementation.
*   `rxjs`: Required by `@bloqz/core`.

## Core Concepts

1.  **Context Creation**: Use standard React `createContext` to hold your Bloc instance.
2.  **Bloc Creation & Provision**: Inside a provider component, use `useCreateBloc` to create a stable Bloc instance. Pass this instance to your Context Provider.
3.  **Consuming the Bloc**: Use `useBloc` with optional strategies (`select`, `get`, `observe`) to consume data or behavior from the Bloc.

## API Documentation

### `useCreateBloc<Event, State>(props: CreateBlocProps<Event, State>): Bloc<Event, State>`

Creates and memoizes a Bloc instance, automatically handling cleanup on unmount.

```typescript
const bloc = useCreateBloc({
  initialState: { count: 0 },
  handlers: { /* ... */ }
});
```

### `useBloc<Event, State, T>(context: Context, strategy?: Strategy): T | Bloc`

The central hook for consuming a Bloc. Its return type and behavior depend on the provided strategy.

#### 1. Accessing the Bloc (Default)

Returns the full Bloc instance. Useful for dispatching events or passing the Bloc around.

```typescript
const bloc = useBloc(CounterContext);
bloc.add({ type: 'INCREMENT' });
```

#### 2. Reactive State Selection (`select`)

Subscribes to the state and returns a selected slice. Re-renders **only** when the selected value changes.

```typescript
import { useBloc, select } from '@bloqz/react';

// Re-renders only when `count` changes
const count = useBloc(CounterContext, select(state => state.count));
```

#### 3. Static Access (`get`, `add`, `close`)

Retrieves a value or method from the Bloc instance **without** subscribing to state changes. The component will **not** re-render when state updates.

**Convenience Helpers:**
*   `add()`: Gets the `add` method.
*   `close()`: Gets the `close` method.

```typescript
import { useBloc, get, add } from '@bloqz/react';

// Get the `add` method (stable reference)
const dispatch = useBloc(CounterContext, add());

// Equivalent to:
// const dispatch = useBloc(CounterContext, get(b => b.add));
```

#### 4. Stream Transformation (`observe`)

Transforms the Bloc's `state$` stream and returns the resulting Observable. Does not trigger re-renders.

```typescript
import { useBloc, observe } from '@bloqz/react';
import { map, debounceTime } from 'rxjs/operators';

const debouncedCount$ = useBloc(CounterContext, observe(state$ =>
  state$.pipe(
    map(s => s.count),
    debounceTime(500)
  )
));
```

## Full Usage Example

```typescript
// --- types.ts ---
export interface CounterState { count: number; }
export type CounterEvent = { type: 'INCREMENT' };

// --- counter.context.ts ---
import { createContext } from 'react';
import { Bloc } from '@bloqz/core';
import { CounterEvent, CounterState } from './types';

export const CounterContext = createContext<Bloc<CounterEvent, CounterState> | null>(null);

// --- CounterProvider.tsx ---
import React from 'react';
import { useCreateBloc } from '@bloqz/react';
import { CounterContext } from './counter.context';

export function CounterProvider({ children }) {
  const bloc = useCreateBloc({
    initialState: { count: 0 },
    handlers: {
      INCREMENT: (_, { update }) => update(s => ({ ...s, count: s.count + 1 })),
    },
  });

  return (
    <CounterContext.Provider value={bloc}>
      {children}
    </CounterContext.Provider>
  );
}

// --- CounterDisplay.tsx ---
import React from 'react';
import { useBloc, select } from '@bloqz/react';
import { CounterContext } from './counter.context';

export function CounterDisplay() {
  // Reactive: Updates when count changes
  const count = useBloc(CounterContext, select(s => s.count));
  return <p>Count: {count}</p>;
}

// --- CounterButton.tsx ---
import React from 'react';
import { useBloc, add } from '@bloqz/react';
import { CounterContext } from './counter.context';

export function CounterButton() {
  // Static: Gets add method, no re-renders on state change
  const dispatch = useBloc(CounterContext, add());

  return <button onClick={() => dispatch({ type: 'INCREMENT' })}>Increment</button>;
}
```

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)
