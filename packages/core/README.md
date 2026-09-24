# Functional Bloc Core (@bloqz/core)

[![npm version](https://badge.fury.io/js/%40bloqz%2Fcore.svg)](https://badge.fury.io/js/%40bloqz%2Fcore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The core package for a lightweight, functional implementation of the Bloc pattern for state management. Inspired by flutter_bloc, built with TypeScript and RxJS. Designed for predictability, testability, and composability.

This core package provides the main `createBloc` factory, type definitions, and the fundamental event processing pipeline. Event handlers are registered upfront during Bloc creation.

## Features

*   **Functional API:** Uses the `createBloc` factory function instead of classes.
*   **RxJS Powered:** Leverages Observables for reactive state and event streams.
*   **Type-Safe:** Built with TypeScript, providing strong typing for events, states, and handlers.
*   **Bloc Pattern:** Enforces separation of concerns by managing state transitions in response to events.
*   **Upfront Handler Registration:** Event handlers are defined declaratively when the Bloc is created.
*   **Configurable Concurrency:** Specify concurrency strategies (transformers) per event handler during creation. Defaults to `concurrent`.
*   **Framework Agnostic:** Core logic is independent of any UI framework (though designed with React in mind).
*   **Error Handling:** Provides both an `errors$` stream and an optional `onError` callback for handler errors.

## Installation

```bash
npm install @bloqz/core
# or
yarn add @bloqz/core
```

`rxjs` (^7.8) is a regular dependency of `@bloqz/core` and is installed with it. The package is ESM-only.

## Core Concepts

*   **Bloc:** The central object created by `createBloc`. It holds the current `State`, processes incoming `Event`s based on pre-registered handlers, and exposes reactive streams (`state$`, `errors$`).
*   **State:** An immutable object representing the current state of a feature or data managed by the Bloc.
*   **Event:** An immutable object representing an occurrence that might lead to a state change. Events **must** be defined as a discriminated union with a `type: string` property for this package version.
*   **Handlers Object:** A configuration object passed to `createBloc` where keys are the string literal `type` of the events, and values define the corresponding `EventHandler` function and optionally an `EventTransformer`.
*   **EventHandler:** A function (`EventHandlerFunction`) or object (`EventHandlerObject`) defining the logic to execute for a specific event type. It receives the `event` and a `BlocContext`.
*   **BlocContext:** An object passed to event handlers containing the Bloc `id`, a frozen snapshot of the state (`value`), an `update` function to change the state, and an `AbortSignal` (`signal`) that aborts when the run is cancelled.
*   **EventTransformer:** A higher-order function (using RxJS operators) that controls the concurrency behavior of an `EventHandler`. Standard transformers (like `sequential`, `restartable`) are expected to be provided by a separate package (e.g., `@bloqz/concurrency`).

## Basic Usage

```typescript
import { createBloc, ErrorHandler } from '@bloqz/core';
// Assumes transformers like sequential, restartable are imported from @bloqz/concurrency or elsewhere
import { sequential, restartable } from '@bloqz/concurrency'; // Example import

// 1. Define State Interface
interface CounterState {
  count: number;
  status: string;
}
const initialState: CounterState = { count: 0, status: 'idle' };

// 2. Define Event Interfaces (Discriminated Union REQUIRED)
interface IncrementEvent { type: 'INCREMENT'; amount: number; }
interface DecrementEvent { type: 'DECREMENT'; amount: number; }
interface FetchDataEvent { type: 'FETCH_DATA'; id: string; }

// Event Union Type
type CounterEvent = IncrementEvent | DecrementEvent | FetchDataEvent;

// 3. Optional: Define a global error handler
const handleBlocError: ErrorHandler<CounterEvent> = (error, event) => {
  // `event` is undefined for pipeline-level errors not tied to an event
  console.error(`>>> Global Error:`, { error, eventType: event?.type });
  // Send to error tracking service...
};

// 4. Create Bloc Instance with Handlers Object
const counterBloc = createBloc<CounterEvent, CounterState>({
  initialState,
  onError: handleBlocError,
  handlers: {
    // Key MUST match the 'type' property of the event
    INCREMENT: (event, { update }) => { // Direct function uses default (concurrent) transformer
      console.log(`Handling +${event.amount}`);
      // event is typed as IncrementEvent
      update(state => ({ ...state, count: state.count + event.amount, status: 'incremented' }));
    },
    DECREMENT: { // Object definition to specify transformer
      handler: (event, { update }) => {
        console.log(`Handling -${event.amount}`);
        // event is typed as DecrementEvent
        update(state => ({ ...state, count: state.count - event.amount, status: 'decremented' }));
      },
      transformer: sequential(), // Use sequential processing for decrement
    },
    FETCH_DATA: {
      handler: async (event, { update, signal }) => {
        console.log(`Handling fetch for ${event.id}`);
        // event is typed as FetchDataEvent
        update(state => ({ ...state, status: `fetching ${event.id}` }));
        // Pass `signal` on so superseded requests are actually cancelled.
        await fetch(`/api/data/${event.id}`, { signal });
        console.log(`Fetch ${event.id} complete`);
        // If this run was cancelled, `update` is a no-op.
        update(state => ({ ...state, status: `fetched ${event.id}` }));
      },
      transformer: restartable(), // A new FETCH_DATA cancels the running one
    }
  }
});

// 5. Subscribe to State Changes (e.g., in React using a custom hook)
const stateSubscription = counterBloc.state$.subscribe(state => {
  console.log("State changed:", state);
});

// 6. Subscribe to Errors (optional)
const errorSubscription = counterBloc.errors$.subscribe(({ event, error }) => {
  // `event` is undefined for errors not tied to a specific event
  console.warn(`--- Handler Error Captured [${event?.type}] ---`, error);
});

// 7. Access Current State Synchronously
console.log("Initial State:", counterBloc.state);

// 8. Dispatch Events using `add`
counterBloc.add({ type: 'INCREMENT', amount: 5 });
counterBloc.add({ type: 'DECREMENT', amount: 2 }); // Processed sequentially relative to other DECREMENT events
counterBloc.add({ type: 'FETCH_DATA', id: 'A' });
counterBloc.add({ type: 'FETCH_DATA', id: 'B' }); // Cancels Fetch A (its signal aborts)

// 9. Clean up (Essential!)
// Call close() when the Bloc is no longer needed to prevent memory leaks.
// Example: setTimeout(() => counterBloc.close(), 2000);
```

## API Reference

### `createBloc<Event, State>(props)`

Factory function to create a new Bloc instance.

*   `props: CreateBlocProps<Event, State>`: Configuration object.
    *   `id?: string`: Optional Bloc ID. Defaults to a generated UUID.
    *   `initialState: State`: The starting state.
    *   `handlers: EventHandlersObject<Event, State>`: An object mapping event type strings to handler definitions.
    *   `onError?: ErrorHandler<Event>`: Optional global error handler callback.
*   **Returns:** `Bloc<Event, State>` - The created Bloc instance.

### `createPipeBloc<Event, State>(props)`

Creates a read-only Bloc whose state comes from an external Observable.

*   `props: CreatePipeBlocProps<State>`:
    *   `source$: Observable<State>`: The source of state values.
    *   `initialState?: State`: Optional. If omitted, `state` is `undefined` until `source$` emits.
    *   `id?: string`: Optional Bloc ID.
*   `add` is a no-op. The Bloc closes when `source$` completes or errors, including synchronously. A source error is emitted on `errors$` as `{ event: undefined, error }` before the Bloc closes.

### `Bloc<Event, State>` Interface

The public API of a Bloc instance created by this package.

*   `id: string`: The Bloc's ID.
*   `state$: Observable<State>`: Observable stream of state changes.
*   `state: State`: Getter for the synchronous current state value.
*   `errors$: Observable<{ event: Event | undefined; error: unknown }>`: Observable stream of handler errors. `event` is `undefined` for errors that are not tied to an event (pipeline errors, `createPipeBloc` source errors).
*   `add(event: Event): void`: Dispatches an event to the Bloc.
*   `close(): void`: Cleans up Bloc resources (subscriptions, etc.) and aborts running handlers. **Must be called**.
*   `isClosed: boolean`: Whether `close()` has been called (the exported `EMPTY` placeholder Bloc is always closed).

### Key Types

*   `CreateBlocProps<Event, State>`: Interface for the configuration object passed to `createBloc`.
*   `EventHandlersObject<Event, State>`: The type for the `handlers` configuration object (keys are event type strings).
*   `EventHandler<EventPayload, State>`: Union type for handler configuration (`EventHandlerFunction | EventHandlerObject`).
*   `EventHandlerFunction<EventPayload, State>`: The signature for the handler function itself.
*   `EventHandlerObject<EventPayload, State>`: Object structure allowing `handler` and `transformer` specification.
*   `ErrorHandler<Event>`: `(error: unknown, event: Event | undefined) => void`, the optional global error callback.
*   `BlocContext<State>`: Object passed to event handlers:
    *   `id`: the Bloc ID.
    *   `value`: a frozen snapshot of the state, taken when the handler starts. It does not change while an async handler runs. Use `update(s => ...)` for the freshest state.
    *   `update(next | (s => next))`: sets the state. It becomes a no-op once the run is cancelled or the Bloc is closed.
    *   `signal: AbortSignal`: aborts when the run is cancelled (e.g. superseded under `restartable()`) or the Bloc closes. Pass it to `fetch` and similar APIs.
*   `EventTransformer<EventPayload>`: Signature for concurrency control functions.
*   `EventTypeOf<Event>` / `ExtractEventByType<Event, Type>`: Utility types for event unions.

## Async State (`State`)

`State<T, E, P = T | undefined>` is a RemoteData-style union for async data: `init`, `loading`, `data` and `error`. `loading` and `error` carry the previous value in the representation `P`, which defaults to `T | undefined`.

```typescript
import { State } from '@bloqz/core';

type UserState = State<User, Error>; // previous value: User | undefined

let s: UserState = State.init();
s = State.loading<User, Error>(undefined);
s = State.data<User, Error>(user);
s = State.error<User, Error>(new Error('boom'), user); // keeps the previous user

switch (s.type) {
  case 'loading': s.value; break; // User | undefined
  case 'data': s.value; break;    // User
  case 'error': s.error; break;   // Error
}
```

Pick any other representation for the previous value through `P`, e.g. `State<User, Error, User | null>` or an `Option<User>` type from your FP library of choice.

## Concurrency Control

Concurrency is managed per event type via the optional `transformer` property within the `EventHandlerObject` in the `handlers` map. Handlers are looked up by event `type`; events without a handler are dropped with a `console.warn`.

*   If a handler is provided directly as a function, or the `transformer` property is omitted from the object, the **default transformer (`concurrent`)** is used.
*   To use specific strategies (like `sequential`, `restartable`, `droppable`), provide an `EventHandlerObject` in the `handlers` map and set its `transformer` property to the desired function (likely imported from `@bloqz/concurrency` or a similar utility package).
*   When a transformer drops a run (`restartable()` superseding it, or `close()`), the run's `context.signal` aborts and its `update` calls are ignored, so a cancelled run can never overwrite newer state. A queued run that has not started when `close()` is called never runs.

## Limitations

*   **String-Based Event Identification:** This version of `createBloc` **requires** events to be defined as a discriminated union with a `type: string` property. Handlers are registered using these string literals as keys in the `handlers` object. Type predicate functions cannot be used as keys for handler registration with this API.

## TypeScript

This library leverages TypeScript for strong typing. Ensure your `Event` type is a discriminated union for proper type inference within your `EventHandler` functions when using the `handlers` object.

## Contributing

Contributions are welcome! Please follow standard practices like opening issues for discussion before submitting pull requests.

## License

[MIT](../LICENSE)