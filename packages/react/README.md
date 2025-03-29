# @bloc/react

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40bloc%2Freact.svg)](https://badge.fury.io/js/%40bloc%2Freact)
<!-- Add other relevant badges: build status, etc. -->

React integration layer for the TypeScript BLoC pattern library (`@bloc/core`). Provides hooks and utilities to easily connect your React components to BLoC instances for state management.

## Purpose

This package bridges the gap between your BLoC business logic (managed using `@bloc/core`) and your React UI components. It leverages React Context and custom hooks (`useBloc`, `useBlocState`, `useBlocSelectState`) built upon `useSyncExternalStore` for efficient, reactive, and concurrent-mode-safe state consumption.

## Features

*   **`createBlocContext`**: Utility to create a React Context specifically typed for your BLoC.
*   **`useBloc`**: Hook to access the BLoC instance provided via context.
*   **`useBlocState`**: Hook to subscribe to the *entire* state of a BLoC and re-render when it changes.
*   **`useBlocSelectState`**: Hook to subscribe to a *selected slice* or derived value from the BLoC's state, optimizing re-renders.
*   **Type-Safe**: Leverages the strong typing of `@bloc/core` and TypeScript for context and hooks.
*   **Concurrent Mode Ready**: Uses `useSyncExternalStore` for safe integration with React's concurrent features.
*   **Decoupled**: Encourages separation of UI components from business logic contained within Blocs.

## Installation

```bash
# Using npm
npm install @bloc/react react @bloc/core rxjs

# Using yarn
yarn add @bloc/react react @bloc/core rxjs
```

## Peer Dependencies

This package relies on the following peer dependencies, which you need to have installed in your project:

*   `react`: Version 18.0.0 or later (due to `useSyncExternalStore` usage).
*   `@bloc/core`: The core BLoC implementation.
*   `rxjs`: Required by `@bloc/core`.

## Core Concepts

1.  **Bloc Creation**: You create your BLoC instance using `createBloc` from `@bloc/core`. It's recommended to create a stable instance, either outside your component tree or memoized within it (e.g., using `useMemo`).
2.  **Context Creation**: Use `createBlocContext` from this package, providing the `initialState` (and optionally `onError`), to create a React Context object typed for your specific Bloc (`Context<Bloc<Event, State>>`).
3.  **Providing the Bloc**: Wrap the relevant part of your component tree with the `<YourBlocContext.Provider value={yourBlocInstance}>` component, passing the stable BLoC instance you created.
4.  **Consuming the Bloc/State**: Inside descendant components:
    *   Use `useBloc(YourBlocContext)` to get direct access to the BLoC instance (e.g., to call `bloc.add(event)`).
    *   Use `useBlocState(YourBlocContext)` to get the latest state value. The component will re-render whenever the state changes.
    *   Use `useBlocSelectState(YourBlocContext, selectorFn)` to get a specific part of the state. The component will *only* re-render if the *result* of the `selectorFn` changes.

## API Documentation

### `createBlocContext<Event, State>(props: CreateBlocProps<Event, State>): Context<Bloc<Event, State>>`

*   **Source:** `create.ts`
*   **Description:** Creates a React Context object pre-configured with a default BLoC instance based on the provided `props` (`initialState`, `onError`).
*   **Important Note:** While this creates a default BLoC, it's **highly recommended** to provide a stable, memoized BLoC instance via the Context Provider (`<Context.Provider value={bloc}>`) in your application instead of relying on this default. Relying on the default can lead to unexpected BLoC recreation if `createBlocContext` is called within components that re-render.
*   **Returns:** A `React.Context` object typed for `Bloc<Event, State>`.

```typescript
// counter.context.ts
import { createBlocContext } from '@bloc/react';
import { CounterEvent, CounterState, initialState } from './types';

// Create the context object. The initialState here defines the state
// of the *default* bloc instance associated with this context.
export const CounterBlocContext = createBlocContext<CounterEvent, CounterState>({
  initialState: initialState,
  // onError: (err, event) => console.error(err, event)
});
```

### `useBloc<Event, State>(context: Context<Bloc<Event, State>>): Bloc<Event, State>`

*   **Source:** `use.ts`
*   **Description:** Hook to access the BLoC instance provided by the nearest `context.Provider`. Uses `React.use` internally.
*   **Throws:** An error if used outside a matching `context.Provider`.
*   **Returns:** The `Bloc<Event, State>` instance from the context.

```typescript
// CounterButtons.tsx
import React from 'react';
import { useBloc } from '@bloc/react';
import { CounterBlocContext } from './counter.context';

function CounterButtons() {
  const counterBloc = useBloc(CounterBlocContext); // Get the bloc instance

  const increment = () => counterBloc.add({ type: 'INCREMENT' });
  const decrement = () => counterBloc.add({ type: 'DECREMENT' });

  return (
    <div>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

### `useBlocState<Event, State>(context: Context<Bloc<Event, State>>): State`

*   **Source:** `state.ts`
*   **Description:** Hook that subscribes to the BLoC's state stream (`state$`) from the provided context using `useSyncExternalStore`. Returns the latest state value and triggers a re-render whenever the state changes.
*   **Returns:** The latest `State` value from the Bloc.

```typescript
// CounterDisplay.tsx
import React from 'react';
import { useBlocState } from '@bloc/react';
import { CounterBlocContext } from './counter.context';

function CounterDisplay() {
  // Subscribe to the entire state object
  const state = useBlocState(CounterBlocContext);

  return <p>Count: {state.count}</p>;
}
```

### `useBlocSelectState<Event, State, T>(context: Context<Bloc<Event, State>>, selector: (state: State) => T): T`

*   **Source:** `select.ts`
*   **Description:** Hook that subscribes to the BLoC's state stream, applies a `selector` function, and returns the selected value using `useSyncExternalStore`. Crucially, it only triggers a re-render if the *result* of the `selector` function changes (using `distinctUntilChanged` internally), optimizing performance.
*   **Parameters:**
    *   `context`: The `BlocContext` object.
    *   `selector`: A function mapping the full `State` to the desired slice or derived value `T`. **Important:** This function *must* be stable. Memoize it with `useCallback` if defined inline, or define it outside the component to prevent performance issues and unnecessary re-subscriptions.
*   **Returns:** The latest selected value `T`.

```typescript
// CounterStatus.tsx
import React, { useCallback } from 'react';
import { useBlocSelectState } from '@bloc/react';
import { CounterBlocContext, CounterState } from './counter.context';

function CounterStatus() {
  // Define a stable selector function (using useCallback here)
  const selectStatus = useCallback((state: CounterState) => state.status, []);

  // Subscribe only to the status string
  const status = useBlocSelectState(CounterBlocContext, selectStatus);

  // This component only re-renders when state.status changes
  console.log('Rendering CounterStatus');

  return <p>Status: {status}</p>;
}
```

## Full Usage Example

```typescript
// 1. Define types (e.g., types.ts)
export interface CounterState {
  count: number;
  status: 'idle' | 'loading';
}
export const initialState: CounterState = { count: 0, status: 'idle' };
export type CounterEvent = { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'SET_STATUS'; status: CounterState['status'] };

// 2. Create Context (e.g., counter.context.ts)
import { createBlocContext } from '@bloc/react';
import { CounterEvent, CounterState, initialState } from './types';

export const CounterBlocContext = createBlocContext<CounterEvent, CounterState>({
  initialState: initialState,
});

// 3. Create Bloc Logic (using @bloc/core)
import { createBloc } from '@bloc/core';
// ... (register handlers for INCREMENT, DECREMENT, SET_STATUS)

// 4. Provide Bloc in App (e.g., App.tsx)
import React, { useMemo } from 'react';
import { createBloc } from '@bloc/core'; // Core bloc creation
import { CounterBlocContext } from './counter.context';
import { initialState, CounterState, CounterEvent } from './types';
import CounterDisplay from './CounterDisplay';
import CounterButtons from './CounterButtons';
import CounterStatus from './CounterStatus';

function App() {
  // Create a stable Bloc instance using useMemo
  const counterBloc = useMemo(() => {
    const bloc = createBloc<CounterEvent, CounterState>({ initialState });
    // Register handlers...
    bloc.on('INCREMENT', (event, { update, value }) => {
        update({ ...value, count: value.count + 1 });
    });
    bloc.on('DECREMENT', (event, { update, value }) => {
        update({ ...value, count: value.count - 1 });
    });
     bloc.on('SET_STATUS', (event, { update, value }) => {
        update({ ...value, status: event.status });
    });
    // ... more handlers
    return bloc;
  }, []);

  // Clean up the Bloc when the App unmounts
  useEffect(() => {
    return () => {
      counterBloc.close();
    };
  }, [counterBloc]);

  return (
    // Provide the memoized instance
    <CounterBlocContext.Provider value={counterBloc}>
      <h1>Counter App</h1>
      <CounterDisplay />
      <CounterStatus />
      <CounterButtons />
    </CounterBlocContext.Provider>
  );
}

// 5. Consume in Components (CounterDisplay.tsx, CounterStatus.tsx, CounterButtons.tsx - see hook examples above)

```

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)