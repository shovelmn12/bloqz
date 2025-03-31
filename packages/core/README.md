# Functional Bloc Core (@bloc/core)

[![npm version](https://badge.fury.io/js/%40bloc%2Fcore.svg)](https://badge.fury.io/js/%40bloc%2Fcore) <!-- Replace with your actual badge URL if published -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other badges like build status, coverage etc. if applicable -->

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
npm install @bloc/core rxjs
# or
yarn add @bloc/core rxjs
```

**Note:** This package relies on `rxjs` as a peer dependency. You need to have it installed in your project.

## Core Concepts

*   **Bloc:** The central object created by `createBloc`. It holds the current `State`, processes incoming `Event`s based on pre-registered handlers, and exposes reactive streams (`state$`, `errors$`).
*   **State:** An immutable object representing the current state of a feature or data managed by the Bloc.
*   **Event:** An immutable object representing an occurrence that might lead to a state change. Events **must** be defined as a discriminated union with a `type: string` property for this package version.
*   **Handlers Object:** A configuration object passed to `createBloc` where keys are the string literal `type` of the events, and values define the corresponding `EventHandler` function and optionally an `EventTransformer`.
*   **EventHandler:** A function (`EventHandlerFunction`) or object (`EventHandlerObject`) defining the logic to execute for a specific event type. It receives the `event` and a `BlocContext`.
*   **BlocContext:** An object passed to event handlers containing the current state `value` and an `update` function to change the state.
*   **EventTransformer:** A higher-order function (using RxJS operators) that controls the concurrency behavior of an `EventHandler`. Standard transformers (like `sequential`, `restartable`) are expected to be provided by a separate package (e.g., `@bloc/concurrency`).

## Basic Usage

```typescript
import { createBloc, BlocErrorHandler } from '@bloc/core';
// Assumes transformers like sequential, restartable are imported from @bloc/concurrency or elsewhere
import { sequential, restartable } from '@bloc/concurrency'; // Example import
import { shareReplay } from 'rxjs';

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
const handleBlocError: BlocErrorHandler<CounterEvent> = (error, event) => {
  console.error(`>>> Global Error:`, { error, eventType: event.type });
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
      handler: async (event, { update }) => {
        console.log(`Handling fetch for ${event.id}`);
        // event is typed as FetchDataEvent
        update(state => ({ ...state, status: `fetching ${event.id}` }));
        await new Promise(res => setTimeout(res, 500)); // Simulate async work
        console.log(`Fetch ${event.id} complete`);
        update(state => ({ ...state, status: `fetched ${event.id}` }));
      },
      transformer: restartable(), // Use restartable processing for fetch
    }
  }
});

// 5. Subscribe to State Changes (e.g., in React using a custom hook)
const stateSubscription = counterBloc.state$.subscribe(state => {
  console.log("State changed:", state);
});

// 6. Subscribe to Errors (optional)
const errorSubscription = counterBloc.errors$.subscribe(({ event, error }) => {
  console.warn(`--- Handler Error Captured [${event.type}] ---`, error);
});

// 7. Access Current State Synchronously
console.log("Initial State:", counterBloc.state);

// 8. Dispatch Events using `add`
counterBloc.add({ type: 'INCREMENT', amount: 5 });
counterBloc.add({ type: 'DECREMENT', amount: 2 }); // Processed sequentially relative to other DECREMENT events
counterBloc.add({ type: 'FETCH_DATA', id: 'A' });
counterBloc.add({ type: 'FETCH_DATA', id: 'B' }); // Will cancel Fetch A

// 9. Clean up (Essential!)
// Call close() when the Bloc is no longer needed to prevent memory leaks.
// Example: setTimeout(() => counterBloc.close(), 2000);
```

## API Reference

### `createBloc<Event, State>(props)`

Factory function to create a new Bloc instance.

*   `props: CreateBlocProps<Event, State>`: Configuration object.
    *   `initialState: State`: The starting state.
    *   `handlers: EventHandlersObject<Event, State>`: An object mapping event type strings to handler definitions.
    *   `onError?: ErrorHandler<Event>`: Optional global error handler callback.
*   **Returns:** `Bloc<Event, State>` - The created Bloc instance.

### `Bloc<Event, State>` Interface

The public API of a Bloc instance created by this package.

*   `state$: Observable<State>`: Observable stream of state changes.
*   `state: State`: Getter for the synchronous current state value.
*   `errors$: Observable<{ event: Event; error: unknown }>`: Observable stream of errors occurring within event handlers.
*   `add(event: Event): void`: Dispatches an event to the Bloc.
*   `close(): void`: Cleans up Bloc resources (subscriptions, etc.). **Must be called**.

### Key Types

*   `CreateBlocProps<Event, State>`: Interface for the configuration object passed to `createBloc`.
*   `EventHandlersObject<Event, State>`: The type for the `handlers` configuration object (keys are event type strings).
*   `EventHandler<EventPayload, State>`: Union type for handler configuration (`EventHandlerFunction | EventHandlerObject`).
*   `EventHandlerFunction<EventPayload, State>`: The signature for the handler function itself.
*   `EventHandlerObject<EventPayload, State>`: Object structure allowing `handler` and `transformer` specification.
*   `ErrorHandler<Event>`: Signature for the optional global error callback.
*   `BlocContext<State>`: Object passed to event handlers (`value`, `update`).
*   `EventTransformer<EventPayload>`: Signature for concurrency control functions.

## Concurrency Control

Concurrency is managed per event type via the optional `transformer` property within the `EventHandlerObject` in the `handlers` map.

*   If a handler is provided directly as a function, or the `transformer` property is omitted from the object, the **default transformer (`concurrent`)** is used.
*   To use specific strategies (like `sequential`, `restartable`, `droppable`), provide an `EventHandlerObject` in the `handlers` map and set its `transformer` property to the desired function (likely imported from `@bloc/concurrency` or a similar utility package).

## Limitations

*   **String-Based Event Identification:** This version of `createBloc` **requires** events to be defined as a discriminated union with a `type: string` property. Handlers are registered using these string literals as keys in the `handlers` object. Type predicate functions cannot be used as keys for handler registration with this API.

## TypeScript

This library leverages TypeScript for strong typing. Ensure your `Event` type is a discriminated union for proper type inference within your `EventHandler` functions when using the `handlers` object.

## Contributing

(Add contribution guidelines if applicable)

## License

[MIT](../LICENSE)