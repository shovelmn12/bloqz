# bloc.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/bloc.js.svg)](https://badge.fury.io/js/bloc.js)
<!-- Add other relevant badges: build status, coverage, etc. -->

A robust, reactive state management library for TypeScript/JavaScript applications, inspired by the BLoC pattern. It leverages RxJS for powerful stream-based processing and includes first-class integration with React via hooks.

## Features

*   **Core BLoC Pattern:** Implements the fundamental BLoC pattern (Events in, State out) for predictable state management.
*   **Type-Safe:** Fully written in TypeScript with strong typing for Events, State, Handlers, Context, and React Hooks.
*   **RxJS Powered:** Uses RxJS Observables (`state$`, `errors$`) for reactive state streams, error handling, and powerful event transformation.
*   **Concurrency Control:** Includes built-in, composable **Event Transformers** (`sequential`, `concurrent`, `restartable`, `droppable`) to manage how event handlers execute relative to each other. Defaults to `concurrent`.
*   **React Integration (`@bloc/react` features):**
    *   `createBlocContext`: Utility to create strongly-typed React Context for Blocs.
    *   `useBloc`: Hook to access the Bloc instance from Context.
    *   `useBlocState`: Hook to subscribe to the *entire* Bloc state, optimized with `useSyncExternalStore`.
    *   `useBlocSelectState`: Hook to subscribe to *slices* of state, preventing unnecessary re-renders, optimized with `useSyncExternalStore`.
*   **Decoupled & Testable:** Promotes separation of concerns between UI and business logic, making Blocs easy to test independently.
*   **Error Handling:** Centralized `errors$` stream for observing handler errors, plus an optional global `onError` callback during Bloc creation.
*   **Resource Management:** Explicit `close()` method for cleaning up resources and preventing memory leaks.
*   **Async State Utility:** Provides a `State<T, E>` union type (`init`, `loading`, `data`, `error`) for easily modeling asynchronous operation states.

## Motivation

`bloc.js` aims to provide a complete and idiomatic state management solution for the TypeScript/JavaScript ecosystem, drawing inspiration from the Flutter BLoC library. It combines a robust core with flexible concurrency control and seamless React integration, focusing on type safety, reactivity, testability, and developer experience.

## Installation

```bash
# Using npm
npm install bloc.js react rxjs fp-ts

# Using yarn
yarn add bloc.js react rxjs fp-ts
```

## Peer Dependencies

This library requires the following peer dependencies to be installed in your project:

*   `react`: Version 18.0.0 or later (for `useSyncExternalStore`).
*   `rxjs`: Core dependency for stream management.
*   `fp-ts`: Used by the optional `State<T, E>` async utility.

## Core Concepts

1.  **Events:** Plain objects representing user actions, system events, etc., that trigger state changes. Often defined as a discriminated union.
2.  **Bloc:** The central class managing state. It receives `Events`, processes them via `Handlers`, updates the `State`, and exposes `state$` / `errors$` streams. Created via `createBloc`.
3.  **State:** An immutable object representing the current state slice managed by the Bloc.
4.  **Handlers:** Functions registered via `bloc.on()` containing the logic to execute for a specific event type. They receive the `event` and a `context` (with `value` and `update`).
5.  **State Stream (`state$`):** An RxJS `Observable` emitting the latest state whenever it changes. React components subscribe to this (via hooks) to update.
6.  **Error Stream (`errors$`):** An RxJS `Observable` emitting errors that occur *within* event handlers.
7.  **Transformers (`EventTransformer`):** Functions (like `sequential()`, `restartable()`, etc.) passed to `bloc.on` that control the concurrency behavior of event handlers using RxJS operators (`concatMap`, `switchMap`, etc.).
8.  **React Context:** Used to provide Bloc instances down the component tree.
9.  **React Hooks:** (`useBloc`, `useBlocState`, `useBlocSelectState`) provide easy and efficient ways to interact with Blocs from React components.

## API Documentation

### Core Bloc API

#### `createBloc<Event, State>(props: CreateBlocProps<Event, State>): Bloc<Event, State>`

Factory function to create a new Bloc instance.

*   `props`:
    *   `initialState: State`: The starting state.
    *   `onError?: (error: unknown, event: Event) => void`: Optional global handler for errors *within* event handlers.
*   **Returns:** A `Bloc` instance.

```typescript
import { createBloc } from 'bloc.js';

const counterBloc = createBloc<CounterEvent, CounterState>({
  initialState: { count: 0 },
  onError: (error, event) => console.error('Bloc Error:', error, event),
});
```

#### `Bloc<Event, State>` Interface

The public API of a Bloc instance.

*   `state$: Observable<State>`: Reactive stream of state changes. Emits immediately on subscription.
*   `state: State`: Synchronous getter for the current state value.
*   `errors$: Observable<{ event: Event; error: unknown }>`: Stream of errors occurring inside handlers.
*   `on(...)`: Registers event handlers (see below).
*   `add(event: Event): void`: Dispatches an event to the Bloc.
*   `close(): void`: Cleans up Bloc resources (unsubscribe, complete subjects). **Essential to call for cleanup.**

#### `bloc.on(...)` Method

Registers an event handler. Supports two identifier types:

1.  **String Literal Type:** `on(eventTypeString, handler, options?)` - For discriminated unions based on `event.type`.
2.  **Type Predicate:** `on(isSpecificEvent, handler, options?)` - For custom type checking via `(event: Event) => event is SpecificEvent`.

*   `handler: EventHandler<SpecificEvent, State>`: The function to run. Signature: `(event, context) => void | Promise<void>`.
    *   `context: BlocContext<State>`: Provides `value` (state snapshot) and `update(newState | (s => s))` function.
*   `options?: OnEventOptions<SpecificEvent>`:
    *   `transformer?: EventTransformer<SpecificEvent>`: Controls concurrency (see **Event Transformers** below). Defaults to `concurrent()`.

```typescript
import { sequential } from 'bloc.js'; // Import transformers

// String literal example
bloc.on('INCREMENT', (event, { update, value }) => {
  update({ count: value.count + event.amount });
});

// Predicate example with transformer
bloc.on(isResetEvent, handleReset, { transformer: sequential() });
```

### Event Transformers (Concurrency Control)

Control how rapidly incoming events of the same type are handled. Provided via `options.transformer` in `bloc.on`.

#### `concurrent<Event>()` (Default)

*   **Behavior:** Processes events in parallel (uses `mergeMap`).
*   **Use Case:** Independent operations, logging. Default if no transformer is specified.

#### `sequential<Event>()`

*   **Behavior:** Processes events one after another (uses `concatMap`).
*   **Use Case:** Ensuring order, preventing race conditions (saving data).

#### `restartable<Event>()`

*   **Behavior:** Processes only the latest event, cancels previous ongoing handlers (uses `switchMap`).
*   **Use Case:** Search-as-you-type, handling latest input only.

#### `droppable<Event>()`

*   **Behavior:** Ignores new events if one is already processing (uses `exhaustMap`).
*   **Use Case:** Preventing duplicate submissions, button debouncing.

```typescript
import { restartable, droppable } from 'bloc.js';

bloc.on('SEARCH', handleSearch, { transformer: restartable() });
bloc.on('SUBMIT', handleSubmit, { transformer: droppable() });
```

### React Integration API

#### `createBlocContext<Event, State>(props: CreateBlocProps<Event, State>): Context<Bloc<Event, State>>`

Creates a React Context typed for your Bloc. Requires `initialState` (and optional `onError`) for a *default* instance (though providing your own instance via Provider is recommended).

```typescript
// counter.context.ts
import { createBlocContext } from 'bloc.js';
export const CounterBlocContext = createBlocContext<CounterEvent, CounterState>({
  initialState: { count: 0 },
});
```

#### `useBloc<Event, State>(context): Bloc<Event, State>`

Hook to access the Bloc instance from the nearest Context Provider. Throws if no Provider is found.

```typescript
// MyComponent.tsx
import { useBloc } from 'bloc.js';
import { CounterBlocContext } from './counter.context';

function MyComponent() {
  const bloc = useBloc(CounterBlocContext);
  // bloc.add(...)
}
```

#### `useBlocState<Event, State>(context): State`

Hook to subscribe to the *entire* state of the Bloc in Context. Re-renders the component on every state change. Uses `useSyncExternalStore`.

```typescript
// CounterDisplay.tsx
import { useBlocState } from 'bloc.js';
import { CounterBlocContext } from './counter.context';

function CounterDisplay() {
  const state = useBlocState(CounterBlocContext);
  return <p>Count: {state.count}</p>;
}
```

#### `useBlocSelectState<Event, State, T>(context, selector): T`

Hook to subscribe to a *slice* or derived value from the Bloc's state. Only re-renders if the *selected* value changes. Uses `useSyncExternalStore`.

*   `selector: (state: State) => T`: **Must be stable** (memoize with `useCallback` or define outside component).

```typescript
// CounterStatus.tsx
import React, { useCallback } from 'react';
import { useBlocSelectState } from 'bloc.js';
import { CounterBlocContext, CounterState } from './counter.context';

function CounterStatus() {
  const selectStatus = useCallback((state: CounterState) => state.status, []);
  const status = useBlocSelectState(CounterBlocContext, selectStatus);
  return <p>Status: {status}</p>; // Only re-renders when status changes
}
```

### Async State Utility (`State<T, E>`)

A utility union type and factories in `bloc.js/state` (or directly exported) for modeling async states: `init`, `loading`, `data`, `error`.

*   `State.init<T, E>()`
*   `State.loading<T, E>(previousValue?: Option<T>)`
*   `State.data<T, E>(value: T)`
*   `State.error<T, E>(error: E, previousValue?: Option<T>)`

*(Requires `fp-ts` for `Option`)*

```typescript
import { State, Option, some, none } from 'bloc.js/state'; // Adjust import based on export
// Or: import { State, Option, some, none } from 'fp-ts/Option'; + State type from bloc.js

type FetchState = State<User, Error>;

bloc.on('FETCH', async (event, { update, value }) => {
  const previous = value.type !== 'init' ? value.value : none;
  update(State.loading<User, Error>(previous));
  try {
    const user = await fetchUserApi(event.id);
    update(State.data(user));
  } catch (e) {
    update(State.error(e as Error, previous));
  }
});
```

## Full React Usage Example

```typescript
// --- types.ts ---
export interface CounterState { count: number; }
export type CounterEvent = { type: 'INCREMENT' } | { type: 'DECREMENT' };
export const initialState: CounterState = { count: 0 };

// --- counter.context.ts ---
import { createBlocContext } from 'bloc.js';
import { CounterEvent, CounterState, initialState } from './types';
export const CounterBlocContext = createBlocContext<CounterEvent, CounterState>({ initialState });

// --- App.tsx ---
import React, { useMemo, useEffect } from 'react';
import { createBloc, Bloc } from 'bloc.js';
import { CounterBlocContext } from './counter.context';
import { initialState, CounterState, CounterEvent } from './types';
import CounterDisplay from './CounterDisplay'; // Assume these exist
import CounterButtons from './CounterButtons';

function App() {
  const counterBloc = useMemo(() => {
    const bloc = createBloc<CounterEvent, CounterState>({ initialState });
    bloc.on('INCREMENT', (_, { update, value }) => update({ count: value.count + 1 }));
    bloc.on('DECREMENT', (_, { update, value }) => update({ count: value.count - 1 }));
    return bloc;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => counterBloc.close(), [counterBloc]);

  return (
    <CounterBlocContext.Provider value={counterBloc}>
      <h1>Bloc Counter</h1>
      <CounterDisplay />
      <CounterButtons />
    </CounterBlocContext.Provider>
  );
}
export default App;

// --- CounterDisplay.tsx ---
import React from 'react';
import { useBlocState } from 'bloc.js';
import { CounterBlocContext } from './counter.context';

function CounterDisplay() {
  const { count } = useBlocState(CounterBlocContext);
  return <h2>Count: {count}</h2>;
}
export default CounterDisplay;

// --- CounterButtons.tsx ---
import React from 'react';
import { useBloc } from 'bloc.js';
import { CounterBlocContext } from './counter.context';

function CounterButtons() {
  const bloc = useBloc(CounterBlocContext);
  return (
    <div>
      <button onClick={() => bloc.add({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => bloc.add({ type: 'DECREMENT' })}>-</button>
    </div>
  );
}
export default CounterButtons;
```

## Contributing

Contributions are welcome! Please open an issue to discuss proposed changes or features before submitting a pull request.

## License

[MIT](./LICENSE)