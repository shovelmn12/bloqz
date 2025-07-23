# @bloc/react

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40bloc%2Freact.svg)](https://badge.fury.io/js/%40bloc%2Freact)
<!-- Add other relevant badges: build status, etc. -->

React integration layer for the functional BLoC pattern library (`@bloc/core`). Provides hooks and utilities to easily connect your React components to BLoC instances for state management.

## Purpose

This package bridges the gap between your BLoC business logic (managed using `@bloc/core`) and your React UI components. It leverages React Context and custom hooks (`useCreateBloc`, `useBloc`, `useBlocState`, `useBlocSelectState`) for efficient, reactive, and concurrent-mode-safe state consumption and Bloc lifecycle management within React. It also includes a helper function (`createBlocContext`) for creating typed React Context objects for your Blocs.

## Features

*   **`useCreateBloc`**: Hook to create and memoize a stable BLoC instance within a component's lifecycle, automatically handling cleanup (`bloc.close()`).
*   **`useBloc`**: Hook to access the BLoC instance provided via context.
*   **`useBlocState`**: Hook to subscribe to the *entire* state of a BLoC and re-render when it changes.
*   **`useBlocSelectState`**: Hook to subscribe to a *selected slice* or derived value from the BLoC's state, optimizing re-renders.
*   **`createBlocContext`**: Utility function to create a React Context specifically typed for a Bloc instance.
*   **Type-Safe**: Leverages the strong typing of `@bloc/core` and TypeScript for context and hooks.
*   **Concurrent Mode Ready**: Uses `useSyncExternalStore` for state subscription hooks (`useBlocState`, `useBlocSelectState`).
*   **Decoupled**: Encourages separation of UI components from business logic contained within Blocs.

## Installation

```bash
# Using npm
npm install @bloc/react

# Using yarn
yarn add @bloc/react
```

## Peer Dependencies

This package relies on the following peer dependencies, which you need to have installed in your project:

*   `react`: Version 18.0.0 or later (due to `useSyncExternalStore` and `use` hook usage).
*   `@bloc/core`: The core BLoC implementation.
*   `rxjs`: Required by `@bloc/core`.

## Core Concepts

1.  **Context Creation**: Use either React's standard `createContext` function or the provided `createBlocContext` helper to create a context object typed for your specific Bloc instance (`Context<Bloc<Event, State> | null | undefined>`). Initializing the context value to `null` or `undefined` is recommended.
2.  **Bloc Creation & Provision**: Inside a component (often a provider component), use the `useCreateBloc` hook from this package to create a stable, memoized BLoC instance, passing the configuration required by `@bloc/core`'s `createBloc`. This hook also handles calling `bloc.close()` automatically on unmount. Pass this stable instance to the `<YourContext.Provider value={yourBlocInstance}>` component, wrapping the part of the tree that needs access.
3.  **Consuming the Bloc/State**: Inside descendant components:
    *   Use `useBloc(YourContext)` to get direct access to the BLoC instance (e.g., to call `bloc.add(event)`).
    *   Use `useBlocState(YourContext)` to get the latest state value. The component will re-render whenever the state changes.
    *   Use `useBlocSelectState(YourContext, selectorFn)` to get a specific part of the state. The component will *only* re-render if the *result* of the `selectorFn` changes.

## API Documentation

*(Note: `@/utils/react`, `@/utils/use`, `@/utils/stream` in source code examples are assumed to map to `react` and other internal files/dependencies. `@bloc/core` refers to the peer dependency.)*

### `createBlocContext<Event, State>(bloc: Bloc<Event, State> | undefined): Context<Bloc<Event, State> | undefined>`

*   **Source:** `context.ts`
*   **Description:** Creates a React Context object typed specifically for holding a Bloc instance (or `undefined`), initializing it with the provided `bloc` instance as its *default value*. Components consuming this context without a matching Provider above them in the tree will receive this default value.
*   **Note:** While this provides type safety, using `React.createContext<Bloc<Event, State> | null>(null)` directly is often preferred standard practice, as relying on default context values can sometimes be less explicit.
*   **Parameters:**
    *   `bloc`: The optional Bloc instance to use as the *default value*. It's generally recommended to pass `undefined` or `null` here and provide the actual instance via `<Context.Provider value={...}>`.
*   **Returns:** A `React.Context` object.

```typescript
// counter.context.ts
import { createBlocContext } from '@bloc/react'; // This package's helper
import { CounterEvent, CounterState } from './types';

// Create the context using the helper, initializing default value to undefined
export const CounterContext = createBlocContext<CounterEvent, CounterState>(undefined);

// Recommended alternative using standard React API:
// import { createContext } from 'react';
// import { Bloc } from '@bloc/core';
// export const CounterContext = createContext<Bloc<CounterEvent, CounterState> | null>(null);
```

### `useCreateBloc<Event, State>(props: CreateBlocProps<Event, State>): Bloc<Event, State>`

*   **Source:** `create.ts`
*   **Description:** Hook that creates and memoizes a Bloc instance using `React.useMemo` with an empty dependency array (`[]`). It ensures the Bloc is created only once per component instance lifecycle and automatically registers `bloc.close()` to be called on unmount via `useEffect`. Provides a stable instance suitable for Context providers.
*   **Parameters:**
    *   `props`: The `CreateBlocProps` object (`initialState`, `handlers`, `onError`) needed by `@bloc/core`'s `createBloc`. **Note:** Only the `props` from the initial render are used.
*   **Returns:** A stable, memoized `Bloc<Event, State>` instance with automatic cleanup.

```typescript
// CounterProvider.tsx
import React from 'react';
import { useCreateBloc } from '@bloc/react';
import { CounterContext } from './counter.context'; // Your context
import { initialState, handlers, CounterEvent, CounterState } from './types'; // Your types/handlers

function CounterProvider({ children }) {
  // Create stable bloc instance using the hook; cleanup is handled internally
  const counterBloc = useCreateBloc<CounterEvent, CounterState>({
    initialState,
    handlers,
  });

  // Provide the bloc via the standard React context provider
  return (
    <CounterContext.Provider value={counterBloc}>
      {children}
    </CounterContext.Provider>
  );
}
```

### `useBloc<Event, State>(context: Context<Bloc<Event, State> | null | undefined>): Bloc<Event, State>`

*   **Source:** `use.ts`
*   **Description:** Hook to access the BLoC instance provided by the nearest `context.Provider`. Uses `React.use` internally. Accepts a context that might be initialized with `null` or `undefined`.
*   **Throws:** An error if used outside a matching `context.Provider` that has provided a non-null/non-undefined Bloc instance.
*   **Returns:** The `Bloc<Event, State>` instance from the context.

```typescript
// CounterButtons.tsx
// ... imports ...
import { CounterContext } from './counter.context'; // Your context

function CounterButtons() {
  const counterBloc = useBloc(CounterContext);
  // ... implement buttons using counterBloc.add() ...
}
```

### `useBlocState<Event, State>(context: Context<Bloc<Event, State> | null | undefined>): State`

*   **Source:** `state.ts`
*   **Description:** Hook that subscribes to the BLoC's state stream (`state$`) from the provided context using `useSyncExternalStore`. Returns the latest state value and triggers a re-render whenever the state changes. Assumes the context provides a valid Bloc instance.
*   **Throws:** An error if used outside a matching `context.Provider` that has provided a non-null/non-undefined Bloc instance (via `useBloc` internally).
*   **Returns:** The latest `State` value from the Bloc.

```typescript
// CounterDisplay.tsx
// ... imports ...
import { useBlocState } from '@bloc/react';
import { CounterContext } from './counter.context'; // Your context

function CounterDisplay() {
  const state = useBlocState(CounterContext);
  return <p>Count: {state.count}</p>;
}
```

### `useBlocSelectState<Event, State, T>(context: Context<Bloc<Event, State> | null | undefined>, selector: (state: State) => T): T`

*   **Source:** `select.ts`
*   **Description:** Hook that subscribes to the BLoC's state stream, applies a `selector` function, and returns the selected value using `useSyncExternalStore`. Optimizes re-renders by using `distinctUntilChanged` internally and only triggering updates if the *result* of the `selector` function changes. Assumes the context provides a valid Bloc instance.
*   **Parameters:**
    *   `context`: The `BlocContext` object (potentially initialized with `null` or `undefined`).
    *   `selector`: A function mapping the full `State` to the desired slice or derived value `T`. **Important:** Must be stable (memoized with `useCallback` or defined outside the component).
*   **Throws:** An error if used outside a matching `context.Provider` that has provided a non-null/non-undefined Bloc instance (via `useBloc` internally).
*   **Returns:** The latest selected value `T`.

```typescript
// CounterStatus.tsx
// ... imports ...
import { useBlocSelectState } from '@bloc/react';
import { CounterContext, CounterState } from './counter.context'; // Your context and state type

function CounterStatus() {
  const selectStatus = useCallback((state: CounterState) => state.status, []);
  const status = useBlocSelectState(CounterContext, selectStatus);
  return <p>Status: {status}</p>;
}
```

## Full Usage Example (Putting it Together)

```typescript
// --- types.ts ---
import { EventHandlersObject, CreateBlocProps, Bloc } from '@bloc/core';
import { Context } from 'react';

// Define State and Event types
export interface CounterState { count: number; status: 'idle' | 'loading'; }
export const initialState: CounterState = { count: 0, status: 'idle' };
export type CounterEvent = { type: 'INCREMENT'; amount: number } | { type: 'DECREMENT'; amount: number };

// Define Handlers object for createBloc
export const handlers: EventHandlersObject<CounterEvent, CounterState> = {
  INCREMENT: (event, { update }) => update(s => ({ ...s, count: s.count + event.amount })),
  DECREMENT: (event, { update }) => update(s => ({ ...s, count: s.count - event.amount })),
};

// Define props for useCreateBloc
export const counterBlocProps: CreateBlocProps<CounterEvent, CounterState> = {
    initialState,
    handlers,
};

// --- counter.context.ts ---
import { createContext } from 'react'; // Use standard React createContext
import { Bloc } from '@bloc/core';
import { CounterEvent, CounterState } from './types';

// Create context using React.createContext, initialized to null
export const CounterContext: Context<Bloc<CounterEvent, CounterState> | null> =
    createContext<Bloc<CounterEvent, CounterState> | null>(null);

// --- CounterProvider.tsx ---
import React from 'react';
import { useCreateBloc } from '@bloc/react'; // This package's hook
import { CounterContext } from './counter.context';
import { counterBlocProps, CounterEvent, CounterState } from './types'; // Import the props object

function CounterProvider({ children }) {
  // Create stable bloc instance using the hook; cleanup is handled internally
  const counterBloc = useCreateBloc<CounterEvent, CounterState>(counterBlocProps);

  return (
    // Provide the bloc via the standard React context provider
    <CounterContext.Provider value={counterBloc}>
      {children}
    </CounterContext.Provider>
  );
}

// --- App.tsx ---
import React from 'react';
import CounterProvider from './CounterProvider';
import CounterDisplay from './CounterDisplay'; // Uses useBlocState(CounterContext)
import CounterButtons from './CounterButtons'; // Uses useBloc(CounterContext)

function App() {
  return (
    <CounterProvider>
      <h1>Counter App</h1>
      <CounterDisplay />
      <CounterButtons />
    </CounterProvider>
  );
}

// --- CounterDisplay.tsx / CounterButtons.tsx / etc. ---
// Implement components using useBloc, useBlocState, useBlocSelectState hooks
// Make sure they import and use `CounterContext` directly. (See API examples above)
```

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)