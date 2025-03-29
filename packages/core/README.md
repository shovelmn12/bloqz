# @bloc/core

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other relevant badges here: build status, npm version, coverage, etc. -->

A lightweight, reactive state management library for TypeScript/JavaScript applications, inspired by the [BLoC pattern](https://bloclibrary.dev/#/coreconcepts). It leverages the power of [RxJS](https://rxjs.dev/) to provide a predictable and testable way to manage application state through events.

## Features

*   **Simple & Predictable:** Follows the BLoC pattern: Events are dispatched, processed by handlers, which update the state. UI components react to state changes.
*   **Type-Safe:** Fully written in TypeScript with strong typing for events, state, handlers, and context. Utilizes discriminated unions and type predicates for precise event handling.
*   **RxJS Powered:** Uses RxJS Observables (`state$`, `errors$`) for reactive state streams and error handling.
*   **Concurrency Control:** Flexible event processing strategies (sequential, concurrent, restartable, droppable) via `EventTransformer`s. Defaults to concurrent processing.
*   **Decoupled:** Promotes separation of concerns between UI (presentation) and business logic.
*   **Testable:** The decoupled nature makes Blocs easy to unit test.
*   **Error Handling:** Centralized stream (`errors$`) for observing errors within event handlers, plus an optional global error callback.
*   **Resource Management:** Includes a `close()` method for proper cleanup of subscriptions and resources, preventing memory leaks.
*   **Async State Utility:** Provides a built-in `State<T, E>` union type (`init`, `loading`, `data`, `error`) for easily modeling asynchronous operation states.

## Motivation

This library aims to provide a robust yet straightforward state management solution for TypeScript projects, drawing inspiration from the battle-tested BLoC pattern popular in the Flutter community, but adapted for the JavaScript/TypeScript ecosystem using RxJS. It focuses on type safety, reactivity, and testability.

## Installation

```bash
# Using npm
npm install @bloc/core

# Using yarn
yarn add @bloc/core
```

*(Note: Replace `@bloc/core` with the actual name you publish this library under. `rxjs` and `fp-ts` are required peer dependencies based on your `stream.ts` and `fp.ts` files.)*

## Core Concepts

1.  **Events:** Represent user actions, system events, or any other occurrence that might trigger a state change. Typically defined as a discriminated union type.
2.  **Bloc:** The central piece. It receives `Events`, processes them using registered `Handlers`, manages the `State`, and exposes the `state$` and `errors$` streams.
3.  **Handlers:** Functions registered via `bloc.on()` that contain the business logic for specific events. They receive the `event` and a `context` (with current state `value` and `update` function).
4.  **State:** An immutable object representing the current state of the feature or application part managed by the Bloc.
5.  **State Stream (`state$`):** An RxJS `Observable` that emits the latest state whenever it changes. UI components subscribe to this stream to rebuild reactively.
6.  **Error Stream (`errors$`):** An RxJS `Observable` that emits errors occurring *inside* event handlers.
7.  **Transformers:** RxJS operator functions (`EventTransformer`) that control how events of a specific type are processed, especially when they arrive rapidly (concurrency control).

## API Documentation

### `createBloc<Event, State>(props: CreateBlocProps<Event, State>): Bloc<Event, State>`

The main factory function to create a new Bloc instance.

**Parameters:**

*   `props`: An object containing:
    *   `initialState: State`: The starting state of the Bloc.
    *   `onError?: BlocErrorHandler<Event>`: (Optional) A global callback function invoked whenever an error occurs *within* any registered event handler. Useful for centralized logging or reporting.
        *   `BlocErrorHandler<Event> = (error: unknown, event: Event) => void`

**Returns:**

*   `Bloc<Event, State>`: The created Bloc instance.

```typescript
import { createBloc } from '@bloc/core'; // Use your actual path/package

interface CounterState {
  count: number;
}

type CounterEvent =
  | { type: 'INCREMENT'; amount: number }
  | { type: 'DECREMENT' };

const counterBloc = createBloc<CounterEvent, CounterState>({
  initialState: { count: 0 },
  onError: (error, event) => {
    console.error('Error processing event:', event, 'Error:', error);
    // reportToMonitoringService(error, event);
  },
});
```

### `Bloc<Event, State>` Interface

The public interface of a Bloc instance.

#### `bloc.state$: Observable<State>`

An RxJS `Observable` stream emitting the current state.
*   Emits the latest state immediately upon subscription.
*   Emits subsequent state updates.
*   Uses `shareReplay(1)` internally.

```typescript
const subscription = counterBloc.state$.subscribe(currentState => {
  console.log('State changed:', currentState);
  // Update UI based on currentState.count
});

// Remember to unsubscribe later!
// subscription.unsubscribe();
```

#### `bloc.state: State`

Synchronous access to the current state value. Useful for imperative reads outside of reactive streams.

```typescript
const currentCount = counterBloc.state.count;
console.log('Current count is:', currentCount);
```

#### `bloc.errors$: Observable<{ event: Event; error: unknown }>`

An RxJS `Observable` stream emitting errors that occur *within* event handlers during processing. Does not emit errors from the RxJS stream pipeline itself (those are handled internally or via the global `onError`).

```typescript
const errorSubscription = counterBloc.errors$.subscribe(({ event, error }) => {
  console.error('Handler error processing event:', event, 'Error:', error);
  // Display user-friendly error message
});

// Remember to unsubscribe later!
// errorSubscription.unsubscribe();
```

#### `bloc.on(...)`

Registers an event handler for a specific event type. Returns the Bloc instance for chaining.

**Overloads:**

1.  **Using String Literal Type (for Discriminated Unions):**
    ```typescript
    bloc.on<TType extends EventTypeOf<Event>>(
      eventTypeIdentifier: TType,
      handler: EventHandler<ExtractEventByType<Event, TType>, State>,
      options?: OnEventOptions<ExtractEventByType<Event, TType>>
    ): Bloc<Event, State>
    ```
    *   `eventTypeIdentifier`: The string literal `type` of the event (e.g., `'INCREMENT'`).
    *   `handler`: The function to execute. The `event` parameter is correctly typed to the specific event subtype.
    *   `options`: Optional configuration (see `OnEventOptions`).

2.  **Using Type Predicate Function:**
    ```typescript
    bloc.on<SpecificEvent extends Event>(
      eventTypeIdentifier: (event: Event) => event is SpecificEvent,
      handler: EventHandler<SpecificEvent, State>,
      options?: OnEventOptions<SpecificEvent>
    ): Bloc<Event, State>
    ```
    *   `eventTypeIdentifier`: A type guard function (`(event: Event) => event is SpecificEvent`).
    *   `handler`: The function to execute. The `event` parameter is typed as `SpecificEvent`.
    *   `options`: Optional configuration (see `OnEventOptions`).

**`EventHandler<Event, State>` Signature:**

```typescript
type EventHandler<Event, State> = (
  event: Event,
  context: BlocContext<State>
) => void | Promise<void>; // Can be sync or async
```

*   `event`: The specific event object being handled.
*   `context`: Provides access to state and update capabilities:
    *   `value: State`: Read-only snapshot of the state when the handler started.
    *   `update: (newState: State | ((currentState: State) => State)) => void`: Function to update the Bloc's state.

**`OnEventOptions<Event>`:**

```typescript
interface OnEventOptions<Event> {
  transformer?: EventTransformer<Event>;
}
```

*   `transformer`: An `EventTransformer` function to control concurrency. If omitted, defaults to concurrent (`mergeMap`) processing.

**Example:**

```typescript
import { restartable } from '@bloc/core/transformers'; // Assuming transformer helpers exist
import { BlocContext } from '@bloc/core'; // Use your actual path/package

// Using string literal
counterBloc.on('INCREMENT', (event, { value, update }) => {
  // event is typed as { type: 'INCREMENT'; amount: number }
  console.log(`Incrementing by ${event.amount} from ${value.count}`);
  update(currentState => ({ count: currentState.count + event.amount }));
});

// Using string literal with async handler and transformer
counterBloc.on('DECREMENT', async (event, { value, update }) => {
  // event is typed as { type: 'DECREMENT' }
  if (value.count > 0) {
    update({ count: value.count - 1 });
    // await someAsyncTask();
  }
}, { transformer: restartable() }); // Use a specific concurrency strategy

// Example with predicate (assuming LegacyEvent is part of CounterEvent union)
function isLegacyEvent(event: CounterEvent): event is LegacyEvent {
    return typeof (event as any).legacyId === 'string';
}

counterBloc.on(isLegacyEvent, (event, { update }) => {
  // event is typed as LegacyEvent
  console.log('Handling legacy:', event.legacyId);
  // ...
});
```

#### `bloc.add(event: Event): void`

Dispatches an event to the Bloc for processing by its registered handler(s).

```typescript
counterBloc.add({ type: 'INCREMENT', amount: 5 });
counterBloc.add({ type: 'DECREMENT' });
```

#### `bloc.close(): void`

Cleans up all resources used by the Bloc instance, including internal subscriptions and subjects. **Crucial to call this when the Bloc is no longer needed** (e.g., in a component's unmount lifecycle) to prevent memory leaks.

```typescript
// Example in a React component
useEffect(() => {
  const bloc = createBloc(/* ... */);
  const stateSub = bloc.state$.subscribe(/* ... */);
  const errorSub = bloc.errors$.subscribe(/* ... */);

  // ... use the bloc ...

  return () => {
    console.log('Closing Bloc and subscriptions');
    stateSub.unsubscribe();
    errorSub.unsubscribe();
    bloc.close(); // Clean up the Bloc itself
  };
}, []);
```

### Concurrency Control (`EventTransformer`)

Event transformers control how rapidly incoming events *of the same type* are handled. This is essential for scenarios like preventing duplicate requests or managing UI updates based on the latest input.

**Type:**

```typescript
type EventTransformer<Event> = (
  project: (event: Event) => ObservableInput<unknown>
) => OperatorFunction<Event, unknown>;
```

*   It's a higher-order function that receives a `project` function (which wraps the actual `EventHandler` execution) and returns an RxJS `OperatorFunction` (like `mergeMap`, `concatMap`, `switchMap`, `exhaustMap`).

**Common Strategies (You might need to implement helper functions for these):**

*   **Concurrent (`mergeMap` - Default):** Processes all events in parallel as they arrive. Good for independent operations.
*   **Sequential (`concatMap`):** Processes events one after another, waiting for the current one to complete before starting the next. Ensures order.
*   **Restartable (`switchMap`):** If a new event arrives, it cancels any ongoing processing for the previous event of the same type and starts processing the new one. Ideal for scenarios like search-as-you-type.
*   **Droppable (`exhaustMap`):** If an event arrives while another of the same type is already being processed, the new event is ignored. Useful for preventing duplicate submissions (e.g., clicking a button multiple times quickly).

**Usage:**

Provide the transformer in the `options` argument of `bloc.on`.

```typescript
import { switchMap } from 'rxjs/operators'; // Or import pre-built helpers

// Example using RxJS operator directly
bloc.on('FETCH_DATA', handleFetch, {
  // Create a transformer using switchMap
  transformer: (project) => switchMap(project)
});

// Example assuming a restartable() helper exists
import { restartable } from '@bloc/core/transformers';
bloc.on('FETCH_DATA', handleFetch, { transformer: restartable() });
```

*(Note: The provided code includes the `EventTransformer` type and the default implementation using `mergeMap`, but not the helper functions like `sequential`, `restartable`, etc. You would typically define these helpers separately using the corresponding RxJS operators.)*

### Async State Management (`State<T, E>`)

The library includes a utility type `State<T, E>` (in `state.ts`) and factory functions (`State.init`, `State.loading`, `State.data`, `State.error`) to easily represent the different states of an asynchronous operation (like fetching data). This can be used as the `State` type in your `createBloc` call.

**Types:**

*   `InitState`: `{ type: "init" }`
*   `LoadingState<T>`: `{ type: "loading"; value: Option<T> }` (Optional previous data)
*   `DataState<T>`: `{ type: "data"; value: T }` (Success)
*   `ErrorState<T, E>`: `{ type: "error"; value: Option<T>; error: E }` (Failure, optional previous data)
*   `State<T, E>`: Union of the above.

*(Requires `fp-ts` for `Option`)*

**Factory Namespace `State`:**

*   `State.init<T, E>()`: Creates an `InitState`.
*   `State.loading<T, E>(value: Option<T>)`: Creates a `LoadingState`.
*   `State.data<T, E>(value: T)`: Creates a `DataState`.
*   `State.error<T, E>(error: E, value?: Option<T>)`: Creates an `ErrorState`.

**Example Usage:**

```typescript
import { createBloc, State, BlocContext } from '@bloc/core'; // Use your actual path/package
import { some, none, Option } from 'fp-ts/Option'; // Required for State<T, E>

// Define types
interface User { id: string; name: string; }
type UserError = { message: string };
type UserBlocState = State<User, UserError>; // Use the Async State utility
type UserEvent = { type: 'FETCH_USER'; userId: string } | { type: 'CLEAR_USER' };

// API fetching function (example)
declare function fetchUserApi(userId: string): Promise<User>;

// Create Bloc
const userBloc = createBloc<UserEvent, UserBlocState>({
  initialState: State.init<User, UserError>(),
});

// Register Handler
userBloc.on('FETCH_USER', async (event, { value, update }) => {
  // Get previous data if available (from loading or error state)
  const previousData: Option<User> = value.type !== 'init' ? value.value : none;

  update(State.loading<User, UserError>(previousData)); // Set loading state

  try {
    const user = await fetchUserApi(event.userId);
    update(State.data<User, UserError>(user)); // Set data state on success
  } catch (err) {
    const error: UserError = { message: (err as Error).message || 'Failed to fetch' };
    update(State.error<User, UserError>(error, previousData)); // Set error state on failure
  }
});

userBloc.on('CLEAR_USER', (event, { update }) => {
    update(State.init<User, UserError>()); // Reset to initial
});

// Subscribe in UI
userBloc.state$.subscribe(state => {
  switch (state.type) {
    case 'init':
      // Show initial UI / prompt
      break;
    case 'loading':
      // Show loading indicator (optionally with state.value if stale data exists)
      break;
    case 'data':
      // Show user data: state.value.name
      break;
    case 'error':
      // Show error message: state.error.message (optionally with state.value if stale data exists)
      break;
  }
});

// Dispatch event
userBloc.add({ type: 'FETCH_USER', userId: '123' });
```

## Dependencies

*   [RxJS](https://rxjs.dev/): For reactive streams and operators.
*   [fp-ts](https://gcanti.github.io/fp-ts/): Used by the `State<T, E>` async utility for `Option` type.

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)
