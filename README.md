# Functional Bloc (JS) - bloc.js

[![npm version](https://badge.fury.io/js/bloc.js.svg)](https://badge.fury.io/js/bloc.js) <!-- Replace bloc.js -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other badges like build status, coverage etc. if applicable -->

A lightweight, functional implementation of the Bloc pattern for state management, inspired by flutter_bloc, built with TypeScript and RxJS. Designed for predictability, testability, and composability, particularly well-suited for React applications (though usable anywhere RxJS is appropriate).

## Features

*   **Functional API:** Uses factory functions (`createBloc`) instead of classes.
*   **RxJS Powered:** Leverages Observables for reactive state and event streams.
*   **Type-Safe:** Built with TypeScript, providing strong typing for events, states, and handlers.
*   **Bloc Pattern:** Enforces separation of concerns by managing state transitions in response to events.
*   **Concurrency Control:** Built-in event transformers (`sequential`, `concurrent`, `restartable`, `droppable`) to manage how event handlers execute. Defaults to `concurrent`.
*   **React Friendly:** Designed to integrate smoothly with React hooks (though core is framework-agnostic).
*   **Error Handling:** Provides both an `errors$` stream and an optional `onError` callback.

## Installation

```bash
npm install @bloc/core
# or
yarn add @bloc/core
```

## Core Concepts

*   **Bloc:** The central piece created by `createBloc`. It manages `State`, processes `Event`s, and exposes streams (`state$`, `errors$`).
*   **State:** An immutable object representing the current state of a feature or piece of data.
*   **Event:** An immutable object representing a user action, system event, or any other occurrence that might lead to a state change. Events are typically defined as a discriminated union.
*   **EventHandler:** A function registered using `bloc.on()` that performs logic in response to a specific `Event` type. It receives the `event` and a `BlocContext` (with `value` and `update`) and can update the state.
*   **EventTransformer:** A higher-order function that wraps an `EventHandler`'s execution logic using RxJS operators (`concatMap`, `mergeMap`, `switchMap`, `exhaustMap`) to control its concurrency behavior.

## Basic Usage

```typescript
import { createBloc, BlocErrorHandler } from '@bloc/core'; 
import { sequential, restartable } from '@bloc/concurrency';
import { shareReplay } from 'rxjs';

// 1. Define State Interface
interface CounterState {
  count: number;
  status: string;
}
const initialState: CounterState = { count: 0, status: 'idle' };

// 2. Define Event Interfaces (Discriminated Union)
interface IncrementEvent { type: 'INCREMENT'; amount: number; }
interface DecrementEvent { type: 'DECREMENT'; amount: number; }
interface FetchDataEvent { type: 'FETCH_DATA'; id: string; }

// Union type for all events
type CounterEvent = IncrementEvent | DecrementEvent | FetchDataEvent;

// 3. Optional: Define a global error handler
const handleBlocError: BlocErrorHandler<CounterEvent> = (error, event) => {
  console.error(`>>> Global Error:`, { error, eventType: (event as any)?.type });
  // Send to error tracking service...
};

// 4. Create Bloc Instance
const counterBloc = createBloc<CounterEvent, CounterState>(initialState, handleBlocError);

// 5. Subscribe to State Changes (e.g., in a React component)
const stateSubscription = counterBloc.state$.subscribe(state => {
  console.log("State changed:", state);
  // In React: setComponentState(state);
});

// 6. Subscribe to Errors (optional)
const errorSubscription = counterBloc.errors$.subscribe(({ event, error }) => {
  console.warn(`--- Handler Error Captured [${(event as any)?.type}] ---`, error);
});

// 7. Register Handlers using `on`
counterBloc
  .on('INCREMENT', (event, { update }) => {
    console.log(`Handling +${event.amount}`);
    // event is correctly typed as IncrementEvent
    update(state => ({ ...state, count: state.count + event.amount, status: 'incremented' }));
  }) // Defaults to concurrent transformer
  .on('DECREMENT', (event, { update }) => {
    console.log(`Handling -${event.amount}`);
    update(state => ({ ...state, count: state.count - event.amount, status: 'decremented' }));
  }, { transformer: sequential() }) // Explicitly sequential
  .on('FETCH_DATA', async (event, { update }) => {
    console.log(`Handling fetch for ${event.id}`);
    update(state => ({ ...state, status: `fetching ${event.id}` }));
    await new Promise(res => setTimeout(res, 500)); // Simulate async work
     // Check if state changed mid-flight (basic cancellation check)
    if (!counterBloc.state.status.includes(`fetching ${event.id}`)) {
         console.log(`FETCH (${event.id}): Cancelled (detected state change).`);
         return;
    }
    console.log(`Fetch ${event.id} complete`);
    update(state => ({ ...state, status: `fetched ${event.id}` }));
  }, { transformer: restartable() }); // Only process the latest fetch

// 8. Dispatch Events using `add`
console.log("Initial State:", counterBloc.state); // Access state synchronously

counterBloc.add({ type: 'INCREMENT', amount: 1 });
counterBloc.add({ type: 'DECREMENT', amount: 2 }); // Will wait for INCREMENT if sequential was used, runs concurrently otherwise (default)
counterBloc.add({ type: 'FETCH_DATA', id: 'A' });
counterBloc.add({ type: 'FETCH_DATA', id: 'B' }); // Will cancel Fetch A because of restartable()

// 9. Clean up (Essential!)
// In a real app, call this when the component unmounts or the Bloc is no longer needed.
// setTimeout(() => {
//    console.log('Cleaning up...');
//    stateSubscription.unsubscribe();
//    errorSubscription.unsubscribe();
//    counterBloc.close();
// }, 2000);

```

## API Reference

### `createBloc<Event, State>(initialState, onError?)`

Factory function to create a new Bloc instance.

*   `initialState: State`: The starting state for the Bloc.
*   `onError?: BlocErrorHandler<Event>`: An optional callback function invoked when an error occurs *within* an event handler.
*   **Returns:** `Bloc<Event, State>` - The created Bloc instance.

### `Bloc<Event, State>` Interface

The public interface of a Bloc instance.

*   `state$: Observable<State>`: An RxJS Observable emitting the current state and subsequent state changes. Uses `shareReplay(1)`.
*   `state: State`: A getter for synchronously accessing the current state value.
*   `errors$: Observable<{ event: Event; error: unknown }>`: An RxJS Observable emitting objects containing the `event` and `error` whenever an error occurs within a registered `EventHandler`.
*   `add(event: Event): void`: Dispatches an event into the Bloc for processing by registered handlers.
*   `on(...)`: Registers an `EventHandler` for a specific event type. See overloads below. Returns the `Bloc` instance for chaining.
*   `close(): void`: Cleans up all resources used by the Bloc (subscriptions, subjects). **Must be called** to prevent memory leaks when the Bloc is no longer needed.

### `on(...)` Overloads

1.  **`on<TType extends EventTypeOf<Event>>(typeString, handler, options?)`**: Registers a handler based on the event's `type` string literal (for discriminated unions). The `event` parameter in the handler is automatically typed correctly.
2.  **`on<SpecificEvent extends Event>(predicate, handler, options?)`**: Registers a handler based on a type predicate function `(event: Event) => event is SpecificEvent`. The `event` parameter in the handler is typed as `SpecificEvent`.

### `OnEventOptions<Event>` Interface

Optional configuration passed to the `on` method.

*   `transformer?: EventTransformer<Event>`: A function that determines the concurrency strategy for the handler. Defaults to `concurrent()` if not provided.

## Event Transformers (Concurrency Control)

Event transformers control how event handlers for the *same event type* behave when events arrive close together or while a handler is already running. They are provided via the `transformer` property in `OnEventOptions`.

The following transformers are built-in:

*   `concurrent()` (**Default**): Executes handlers in parallel as events arrive. Uses `mergeMap`. Safe only if handlers are independent.
*   `sequential()`: Executes handlers one after another, ensuring completion before starting the next. Uses `concatMap`. Guarantees order.
*   `restartable()`: Starts processing the latest event and cancels any ongoing execution for the *same event type*. Uses `switchMap`. Ideal for scenarios like type-ahead search.
*   `droppable()`: Ignores new events of the *same type* if one is already being processed. Uses `exhaustMap`. Good for preventing duplicate actions like button spam.

You can also create custom transformers using any combination of RxJS operators, adhering to the `EventTransformer<Event>` signature.

## Error Handling

Errors occurring *inside* an `EventHandler` (synchronous throws or Promise rejections) are caught and handled in two ways:

1.  **`onError` Callback:** If an `onError(error, event)` function was provided to `createBloc`, it will be called with the error and the event that caused it.
2.  **`errors$` Stream:** An object `{ event: Event; error: unknown }` is emitted on the `bloc.errors$` observable stream.

Importantly, errors within handlers **do not** stop the Bloc's main event processing stream.

Errors in the RxJS pipeline itself (less common) are considered unrecoverable, will be emitted on `errors$` (with `event` potentially being `undefined`), may call `onError`, and will trigger `bloc.close()`.

## Usage with React (Conceptual)

This library provides the core Bloc logic. To use it effectively in React:

1.  **Create Blocs:** Instantiate your Blocs, perhaps in a context provider or a top-level component.
2.  **Subscribe to State:** Use `useEffect` and `useState` to subscribe to `bloc.state$` and update component state. Remember to unsubscribe on cleanup using `bloc.close()`.
3.  **Dispatch Events:** Call `bloc.add(event)` from event handlers (like `onClick`) or `useEffect` hooks.
4.  **Custom Hooks (Recommended):** Create custom hooks like `useBlocState(bloc)` or `useBlocSelector(bloc, selectorFn)` to encapsulate the subscription logic and make component code cleaner.

```typescript
// Example custom hook (simplified)
import { useState, useEffect } from 'react';
import { Bloc } from '@bloc/core'; 

function useBlocState<Event, State>(bloc: Bloc<Event, State>): State {
  const [state, setState] = useState<State>(() => bloc.state); // Initial sync state

  useEffect(() => {
    const subscription = bloc.state$.subscribe(setState);
    // No need to call bloc.close() here; manage Bloc lifecycle separately
    return () => subscription.unsubscribe();
  }, [bloc]); // Resubscribe if bloc instance changes

  return state;
}

// In your component:
// const counterState = useBlocState(counterBloc);
// return <p>Count: {counterState.count}</p>;
```

## TypeScript

The library is written in TypeScript and provides strong type inference for events, state, and handlers, significantly reducing runtime errors. Define your events using discriminated unions for the best experience with the `on('string', ...)` overload.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests. (Add more specific contribution guidelines if desired).

## License

[MIT](https://opensource.org/licenses/MIT)
