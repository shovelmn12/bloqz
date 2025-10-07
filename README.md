# bloqz.js - Functional Bloc Pattern for JS/TS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other relevant badges: build status, test coverage, npm versions for each package -->
<!-- [![npm version (@bloqz/core)](https://badge.fury.io/js/%40bloqz%2Fcore.svg)](https://badge.fury.io/js/%40bloqz%2Fcore) -->
<!-- [![npm version (@bloqz/react)](https://badge.fury.io/js/%40bloqz%2Freact.svg)](https://badge.fury.io/js/%40bloqz%2Freact) -->
<!-- [![npm version (@bloqz/concurrency)](https://badge.fury.io/js/%40bloqz%2Fconcurrency.svg)](https://badge.fury.io/js/%40bloqz%2Fconcurrency) -->

A lightweight, functional implementation of the Bloc pattern for state management in JavaScript and TypeScript applications. Inspired by flutter_bloc, built with TypeScript and RxJS. Designed for predictability, testability, and composability.

This project provides a core engine (`@bloqz/core`), React integration hooks (`@bloqz/react`), and standard concurrency utilities (`@bloqz/concurrency`).

## Core Philosophy

*   **Functional:** Prefers functions and immutability over classes.
*   **Reactive:** Leverages RxJS Observables for event and state streams.
*   **Type-Safe:** Built with TypeScript for robust development.
*   **Predictable:** State is a pure function of the previous state and the current event.
*   **Decoupled:** Separates business logic (Blocs) from the UI (React components).

## Features

*   **Functional Core (`@bloqz/core`):** `createBloc` factory for building Blocs.
*   **Reactive Streams (`@bloqz/core`):** `state$` and `errors$` Observables via RxJS.
*   **Type Safety (`@bloqz/core`):** Strong typing for Events, States, Handlers, and context.
*   **Upfront Handler Definition (`@bloqz/core`):** Event handlers are defined declaratively on Bloc creation.
*   **Configurable Concurrency (`@bloqz/core`, `@bloqz/concurrency`):** Specify event processing strategies (sequential, concurrent, restartable, droppable) per handler.
*   **React Integration (`@bloqz/react`):** Hooks (`useCreateBloc`, `useBloc`, `useBlocState`, `useBlocSelectState`) for easy integration with React components.
*   **Automatic Cleanup (`@bloqz/react`):** `useCreateBloc` handles `bloc.close()` automatically.
*   **Concurrent Mode Ready (`@bloqz/react`):** Uses `useSyncExternalStore` for efficient state subscriptions.
*   **Optimized Re-renders (`@bloqz/react`):** `useBlocSelectState` minimizes component updates.

## Packages

This project is organized into the following packages:

*   **`@bloqz/core`**: The core engine. Contains `createBloc`, fundamental type definitions (`Bloc`, `EventHandler`, `BlocContext`, etc.), and the RxJS-based event processing pipeline. It's framework-agnostic.
*   **`@bloqz/react`**: Provides React Hooks (`useCreateBloc`, `useBloc`, `useBlocState`, `useBlocSelectState`) and utilities for integrating Blocs seamlessly into React applications using Context.
*   **`@bloqz/concurrency`**: Exports standard `EventTransformer` functions (`sequential`, `concurrent`, `restartable`, `droppable`) for use with `@bloqz/core`.

## Installation

Install the necessary packages for your setup. Typically, you'll need `@bloqz/core`, `rxjs`, and if using React, also `@bloqz/react`, `react`, and potentially `@bloqz/concurrency`.

```bash
# For a React project
npm install @bloqz/react
# or
yarn add @bloqz/react

# For non-React usage (core only)
npm install @bloqz/core
# or
yarn add @bloqz/core
```

## Peer Dependencies

*   `@bloqz/react` requires `react` (v18+).
*   `@bloqz/concurrency` requires `@bloqz/core`.

## Core Concepts (`@bloqz/core`)

*   **Bloc:** Created by `createBloc`. Manages `State`, processes `Event`s via pre-defined `handlers`.
*   **State:** Immutable data representing the current state.
*   **Event:** Immutable data representing something that happened. Must be a discriminated union with a `type: string` property for the default `createBloc` API.
*   **`CreateBlocProps`:** Configuration object for `createBloc`, includes `initialState`, `handlers`, `onError?`.
*   **`handlers` Object:** Maps event `type` strings to `EventHandler` definitions (either a function or an object `{ handler, transformer? }`).
*   **`EventHandler`:** The logic to run for an event. Receives `event` and `BlocContext`.
*   **`BlocContext`:** Provides `value` (current state snapshot) and `update` (function to change state) to handlers.
*   **`EventTransformer`:** Controls concurrency (how handlers for the same event type run relative to each other).

## React Integration (`@bloqz/react`)

*   **`React.createContext`:** Use React's standard function to create a typed context (`Context<Bloc | null>`).
*   **`useCreateBloc`:** Hook to create a stable, auto-closing Bloc instance within a component (ideal for providers).
*   **`Context.Provider`:** Standard React provider to pass the stable Bloc instance down the tree.
*   **`useBloc`:** Hook to access the Bloc instance from context.
*   **`useBlocState`:** Hook to subscribe to the entire state and re-render on changes.
*   **`useBlocSelectState`:** Hook to subscribe to a slice/derived value of the state, optimizing re-renders.

## Concurrency (`@bloqz/concurrency`)

*   Provides standard `EventTransformer` functions (`sequential`, `concurrent`, `restartable`, `droppable`) to be used in the `handlers` configuration when creating a Bloc.

## Basic Usage (React Example)

```typescript
// --- 1. Define Types (types.ts) ---
import { EventHandlersObject, CreateBlocProps, Bloc } from '@bloqz/core';
import { Context } from 'react';

export interface CounterState { count: number; }
export const initialState: CounterState = { count: 0 };
export type CounterEvent = { type: 'INCREMENT'; amount: number } | { type: 'DECREMENT' };

export const handlers: EventHandlersObject<CounterEvent, CounterState> = {
  INCREMENT: (event, { update }) => update(s => ({ ...s, count: s.count + event.amount })),
  DECREMENT: (event, { update }) => update(s => ({ ...s, count: s.count - 1 })), // Using default (concurrent) transformer
};

export const counterBlocProps: CreateBlocProps<CounterEvent, CounterState> = {
    initialState,
    handlers,
};

// --- 2. Create Context (counter.context.ts) ---
import { createContext } from 'react';
export const CounterContext = createContext<Bloc<CounterEvent, CounterState> | null>(null);

// --- 3. Create Provider (CounterProvider.tsx) ---
import React from 'react';
import { useCreateBloc } from '@bloqz/react';
import { CounterContext } from './counter.context';
import { counterBlocProps, CounterEvent, CounterState } from './types';

function CounterProvider({ children }) {
  const counterBloc = useCreateBloc<CounterEvent, CounterState>(counterBlocProps);
  return (
    <CounterContext.Provider value={counterBloc}>
      {children}
    </CounterContext.Provider>
  );
}

// --- 4. Use in Components (CounterDisplay.tsx) ---
import React from 'react';
import { useBlocState } from '@bloqz/react';
import { CounterContext } from './counter.context';

function CounterDisplay() {
  const state = useBlocState(CounterContext);
  return <p>Count: {state.count}</p>;
}

// --- 5. Use in Components (CounterButtons.tsx) ---
import React from 'react';
import { useBloc } from '@bloqz/react';
import { CounterContext } from './counter.context';

function CounterButtons() {
  const bloc = useBloc(CounterContext);
  return (
    <>
      <button onClick={() => bloc.add({ type: 'INCREMENT', amount: 1 })}>+</button>
      <button onClick={() => bloc.add({ type: 'DECREMENT' })}>-</button>
    </>
  );
}

// --- 6. Root Component (App.tsx) ---
import React from 'react';
import CounterProvider from './CounterProvider';
import CounterDisplay from './CounterDisplay';
import CounterButtons from './CounterButtons';

function App() {
  return (
    <CounterProvider>
      <h1>Bloc Counter</h1>
      <CounterDisplay />
      <CounterButtons />
    </CounterProvider>
  );
}
```

## API Documentation

### `@bloqz/core`

#### `createBloc<Event, State>(props: CreateBlocProps<Event, State>): Bloc<Event, State>`

*   Creates a Bloc instance.
*   `props.initialState`: The starting state.
*   `props.handlers`: Object mapping event type strings to handler definitions (function or `{ handler, transformer? }`).
*   `props.onError?`: Optional global error handler for handler exceptions.

#### `Bloc<Event, State>` Interface

*   `state$: Observable<State>`: Stream of state changes.
*   `state: State`: Synchronous getter for current state.
*   `errors$: Observable<{ event: Event; error: unknown }>`: Stream of handler errors.
*   `add(event: Event): void`: Dispatches an event.
*   `close(): void`: Cleans up resources. **Must be called.**

#### Key Core Types

*   `CreateBlocProps`: Input for `createBloc`.
*   `EventHandlersObject`: Type for the `handlers` object.
*   `EventHandler`: Union type (`EventHandlerFunction` | `EventHandlerObject`).
*   `EventHandlerFunction`: Signature `(event, context) => void | Promise<void>`.
*   `EventHandlerObject`: `{ handler: EventHandlerFunction, transformer?: EventTransformer }`.
*   `ErrorHandler`: Signature `(error, event) => void`.
*   `BlocContext`: `{ value: State, update: (newState | fn) => void }` passed to handlers.
*   `EventTransformer`: `(project) => OperatorFunction` for concurrency.
*   `EventTypeIdentifier`: Internal type (primarily string for this API).

### `@bloqz/react`

#### `useCreateBloc<Event, State>(props): Bloc<Event, State>`

*   Creates a memoized Bloc instance using `@bloqz/core`'s `createBloc`.
*   Automatically calls `bloc.close()` on unmount.
*   Ideal for use in Context Providers.

#### `useBloc<Event, State>(context): Bloc<Event, State>`

*   Accesses the Bloc instance from the specified React Context.
*   Throws if used outside a Provider.

#### `useBlocState<Event, State>(context): State`

*   Subscribes to the Bloc's *entire* state using `useSyncExternalStore`.
*   Returns the latest state and re-renders on any state change.

#### `useBlocSelectState<Event, State, T>(context, selector): T`

*   Subscribes to the Bloc's state, applies a `selector` function using `useSyncExternalStore`.
*   Optimizes re-renders; only updates if the *selected* value changes.
*   Requires a stable `selector` function (use `useCallback` or define outside).

*(Other hooks like `useBlocPipeState` could be added here if implemented).*

### `@bloqz/concurrency`

Exports standard `EventTransformer` functions:

*   `sequential<Event>()`: Processes events one by one (uses `concatMap`).
*   `concurrent<Event>()`: Processes events in parallel (uses `mergeMap`). **Default if no transformer is specified in `@bloqz/core`**.
*   `restartable<Event>()`: Processes the latest event, cancels previous (uses `switchMap`).
*   `droppable<Event>()`: Ignores new events if one is running (uses `exhaustMap`).

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](LICENSE)