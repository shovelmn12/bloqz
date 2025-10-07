# @bloqz/concurrency

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other relevant badges: npm version, build status, etc. -->
<!-- npm i -D @types/node -->
[![npm version](https://badge.fury.io/js/%40bloqz%2Fconcurrency.svg)](https://badge.fury.io/js/%40bloqz%2Fconcurrency)

Concurrency utilities (Event Transformers) for the TypeScript BLoC pattern implementation.

## Purpose

This package provides helper functions that create standard `EventTransformer` implementations based on common RxJS operators. These transformers are used with the `bloc.on` method (from `@bloqz/core` or a similar BLoC implementation) to control how event handlers execute, especially when events are dispatched rapidly or involve asynchronous operations.

Choosing the right concurrency strategy is crucial for preventing race conditions, optimizing performance, and ensuring predictable behavior in reactive applications.

## Installation

```bash
# Using npm
npm install @bloqz/concurrency rxjs

# Using yarn
yarn add @bloqz/concurrency rxjs
```

**Peer Dependencies:**

This package requires `rxjs` as a peer dependency. It's designed to be used with a core BLoC library (like `@bloqz/core`) that defines the `EventTransformer` type.

## Usage

Import the desired transformer function and provide it to the `options.transformer` property when registering an event handler using `bloc.on`.

```typescript
import { createBloc, EventHandler } from '@bloqz/core'; // Assuming core package
import {
  sequential,
  restartable,
  droppable,
  concurrent, // Can be used explicitly, but often the default
} from '@bloqz/concurrency';

// --- Define your Bloc, State, Event ---
interface MyState { /* ... */ }
type MyEvent =
  | { type: 'SAVE' }
  | { type: 'SEARCH'; query: string }
  | { type: 'SUBMIT' }
  | { type: 'LOG' };

declare const bloc: Bloc<MyEvent, MyState>; // Your bloc instance
declare const handleSave: EventHandler<ExtractEventByType<MyEvent, 'SAVE'>, MyState>;
declare const handleSearch: EventHandler<ExtractEventByType<MyEvent, 'SEARCH'>, MyState>;
declare const handleSubmit: EventHandler<ExtractEventByType<MyEvent, 'SUBMIT'>, MyState>;
declare const handleLog: EventHandler<ExtractEventByType<MyEvent, 'LOG'>, MyState>;
// ---------------------------------------

// Process SAVE events one after another
bloc.on('SAVE', handleSave, {
  transformer: sequential(),
});

// Process only the latest SEARCH event, cancel previous searches
bloc.on('SEARCH', handleSearch, {
  transformer: restartable(),
});

// Ignore subsequent SUBMIT events if one is already processing
bloc.on('SUBMIT', handleSubmit, {
  transformer: droppable(),
});

// Process LOG events concurrently (often the default behavior)
bloc.on('LOG', handleLog, {
  transformer: concurrent(), // Explicitly concurrent
});
// Or rely on the default if the core library defaults to concurrent
// bloc.on('LOG', handleLog);
```

## Available Transformers

### `concurrent<Event>()`

*   **Source:** `concurrent.ts`
*   **Behavior:** Processes events **concurrently** (in parallel). Multiple handler executions for the same event type can run simultaneously.
*   **Underlying Operator:** `mergeMap`
*   **Use Cases:**
    *   Handlers that are independent of each other.
    *   Operations where parallel execution is safe and potentially improves throughput (e.g., logging, triggering independent notifications).
*   **Caution:** Be mindful of potential race conditions if concurrent handlers modify shared aspects of the state or interact with external resources non-atomically.
*   **Default:** This strategy often serves as the **default** in core BLoC implementations if no specific transformer is provided.

```typescript
import { concurrent } from '@bloqz/concurrency';
bloc.on('LOG_EVENT', handleLogToServer, { transformer: concurrent() });
```

---

### `sequential<Event>()`

*   **Source:** `sequential.ts`
*   **Behavior:** Processes events **sequentially** (one after another). The next handler execution for an event type only begins after the previous one has completed.
*   **Underlying Operator:** `concatMap`
*   **Use Cases:**
    *   Ensuring events are processed in the order they were received.
    *   Preventing race conditions when handlers modify the same state properties or interact with resources that require ordered access (e.g., saving data sequentially, managing queues).

```typescript
import { sequential } from '@bloqz/concurrency';
bloc.on('SAVE_DATA', handleSave, { transformer: sequential() });
```

---

### `restartable<Event>()`

*   **Source:** `restartable.ts`
*   **Behavior:** Processes **only the latest** event. If a new event arrives while a previous handler for the same event type is still running, the previous execution is cancelled, and the handler starts processing the new event.
*   **Underlying Operator:** `switchMap`
*   **Use Cases:**
    *   Search-as-you-type functionality, where only the results for the most recent query matter.
    *   Handling rapidly changing inputs where intermediate states are irrelevant (e.g., real-time validation on input change).
    *   Refreshing data where only the latest request should complete.

```typescript
import { restartable } from '@bloqz/concurrency';
bloc.on('SEARCH_QUERY_CHANGED', handleSearch, { transformer: restartable() });
```

---

### `droppable<Event>()`

*   **Source:** `droppable.ts`
*   **Behavior:** **Ignores (drops)** new events if a handler for the same event type is already running. Only the first event in a sequence triggers execution until that execution completes.
*   **Underlying Operator:** `exhaustMap`
*   **Use Cases:**
    *   Preventing duplicate form submissions caused by rapid button clicks.
    *   Handling events where only the initial trigger should be processed until completion (e.g., initiating a long-running, non-cancellable task).
    *   Simple button debouncing where subsequent clicks during processing should be ignored.

```typescript
import { droppable } from '@bloqz/concurrency';
bloc.on('SUBMIT_FORM', handleSubmit, { transformer: droppable() });
```

---

## Core Concept: `EventTransformer`

These helpers produce functions matching the `EventTransformer` signature expected by the core BLoC library:

```typescript
// Likely defined in @bloqz/core or @bloqz/types
type EventTransformer<Event> = (
  project: (event: Event) => ObservableInput<unknown>
) => OperatorFunction<Event, unknown>;
```

The `project` function encapsulates the execution of your actual `EventHandler` logic. The transformer applies the chosen RxJS operator (`mergeMap`, `concatMap`, etc.) to the stream of incoming events, controlling how the `project` function is invoked.

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)