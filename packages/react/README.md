# @bloqz/react

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40bloqz%2Freact.svg)](https://badge.fury.io/js/%40bloqz%2Freact)
<!-- Add other relevant badges: build status, etc. -->

React integration layer for the functional BLoC pattern library (`@bloqz/core`). Provides hooks and utilities to easily connect your React components to BLoC instances for state management.

## Purpose

This package bridges the gap between your BLoC business logic (managed using `@bloqz/core`) and your React UI components. It leverages React Context and a versatile custom hook (`useBloc`) for efficient, reactive, and concurrent-mode-safe state consumption and Bloc lifecycle management within React.

## Features

*   **`useCreateBloc`**: Hook that creates one BLoC instance per component, keeps it across re-renders, and closes it on unmount (`React.StrictMode`-safe). An optional `deps` list recreates it when inputs change.
*   **`useBloc`**: The unified hook for all Bloc interactions.
    *   **Access Bloc**: Get the full Bloc instance.
    *   **Reactive State**: Select parts of the state with efficient re-renders using the `select` strategy.
    *   **Static Access**: Get static values or methods without subscriptions using the `get` strategy.
    *   **Stream Access**: Transform and consume the underlying state stream using the `observe` strategy.
*   **Strategy Helpers**: `select`, `get`, `observe`, `add`, and `close` are plain factory functions (not hooks) that define how you want to consume the Bloc. You can create them inline, at module scope, or conditionally.
*   **`createBlocContext`**: Small typed helper around `React.createContext`.
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

*   `react`: Version 18.0.0 or later (due to `useSyncExternalStore`).
*   `@bloqz/core`: The core BLoC implementation.
*   `rxjs`: Required by `@bloqz/core`.

## Core Concepts

1.  **Context Creation**: Use `createBlocContext` or standard React `createContext` to hold your Bloc instance. `Context<Bloc<E, S>>`, `Context<Bloc<E, S> | undefined>` and `Context<Bloc<E, S> | null>` are all accepted by `useBloc`.
2.  **Bloc Creation & Provision**: Inside a provider component, use `useCreateBloc` to create a stable Bloc instance. Pass this instance to your Context Provider.
3.  **Consuming the Bloc**: Use `useBloc` with optional strategies (`select`, `get`, `observe`) to consume data or behavior from the Bloc.

## API Documentation

### `useCreateBloc(props, deps?): Bloc<Event, State>`

Creates a Bloc instance once per component and closes it when the component unmounts. It accepts either `CreateBlocProps` (event-driven Bloc, via `createBloc`) or `CreatePipeBlocProps` (stream-driven Bloc, via `createPipeBloc`).

```typescript
// Inline props are fine: they are only read when the Bloc is created.
const bloc = useCreateBloc({
  initialState: { count: 0 },
  handlers: { /* ... */ }
});
```

*   **Props are read only on creation.** This is the same contract as `useState`'s initial value. Passing a new props object on each render does not recreate the Bloc or reset its state, and later changes to `props` are ignored.
*   **`deps` (optional)**: a dependency list, like `useEffect`'s. When any entry changes (compared with `Object.is`), the current Bloc is closed and a new one is created from that render's props. It defaults to `[]`, which means the Bloc is never recreated.

    ```typescript
    // A fresh Bloc for each user; the previous one is closed.
    const bloc = useCreateBloc(
      { initialState: { userId, user: undefined }, handlers },
      [userId]
    );
    ```
*   **StrictMode**: in development, React's simulated unmount/remount closes the first Bloc. The hook then creates a fresh one from the same props and re-renders, so the mounted component always ends up with an open Bloc. The instance from the very first render may therefore not be the one that stays mounted.

### `useBloc<Event, State, T>(context: Context, strategy?: Strategy): T | Bloc`

The central hook for consuming a Bloc. Its return type and behavior depend on the provided strategy. It throws if no Bloc is provided (the context value is `null` or `undefined`).

Strategies are plain objects produced by factory functions, so you can also define them once at module scope:

```typescript
const selectCount = select((s: CounterState) => s.count);

function Count() {
  const count = useBloc(CounterContext, selectCount);
  // ...
}
```

#### 1. Accessing the Bloc (Default)

Returns the full Bloc instance. Useful for dispatching events or passing the Bloc around.

```typescript
const bloc = useBloc(CounterContext);
bloc.add({ type: 'INCREMENT' });
```

#### 2. Reactive State Selection (`select`)

Subscribes to the state and returns a selected slice. Re-renders **only** when the selected value changes, compared deeply with lodash `isEqual`. While the selection stays equal, the hook returns the **same reference**, so selectors that return objects are safe to use.

Inline selectors are fine. The hook subscribes once per Bloc and always applies the latest selector, so a selector that changes between renders (for example, one that closes over a prop) takes effect on the next render.

```typescript
import { useBloc, select } from '@bloqz/react';

// Re-renders only when `count` changes
const count = useBloc(CounterContext, select(state => state.count));

// Object selections are fine too: no re-render unless `count` or `name` change.
const view = useBloc(CounterContext, select(s => ({ count: s.count, name: s.name })));
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

The Observable is memoized on the Bloc and the **selector's identity**. Pass a stable selector (a module-level function or `useCallback`) to get the same Observable across renders. An inline selector builds a new Observable on every render.

```typescript
import { useBloc, observe } from '@bloqz/react';
import { Observable } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';

// Stable selector defined outside the component.
const debouncedCount = (state$: Observable<CounterState>) =>
  state$.pipe(
    map(s => s.count),
    debounceTime(500)
  );

const debouncedCount$ = useBloc(CounterContext, observe(debouncedCount));
```

## Full Usage Example

```typescript
// --- types.ts ---
export interface CounterState { count: number; }
export type CounterEvent = { type: 'INCREMENT' };

// --- counter.context.ts ---
import { createBlocContext } from '@bloqz/react';
import { CounterEvent, CounterState } from './types';

export const CounterContext = createBlocContext<CounterEvent, CounterState>();
// Equivalent: createContext<Bloc<CounterEvent, CounterState> | undefined>(undefined)

// --- CounterProvider.tsx ---
import React from 'react';
import { useCreateBloc } from '@bloqz/react';
import { CounterContext } from './counter.context';
import { CounterEvent, CounterState } from './types';

export function CounterProvider({ children }) {
  // Created once for this provider and closed on unmount.
  const bloc = useCreateBloc<CounterEvent, CounterState>({
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
