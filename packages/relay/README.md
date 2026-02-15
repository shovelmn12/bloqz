# @bloqz/relay

The `@bloqz/relay` package provides a lightweight, RxJS-powered event bus for enabling communication between different parts of an application. It uses a flexible subscription model and supports TypeScript generics for full type safety.

## Core Concepts

- **Relay**: An event bus that allows for emitting and listening to events.
- **Topics**: Named channels for events (e.g., 'user', 'cart'), allowing for targeted communication.
- **Events**: The data payload associated with a topic. All events must be objects and are recommended to have a `type` property.

## Installation

This package is part of the Bloqz monorepo. To use it, add it as a dependency in your `package.json`:

```json
"dependencies": {
  "@bloqz/relay": "2.0.2"
}
```

## Usage

### Creating a Relay

The primary export of this package is the `createRelay` function.

```typescript
import { createRelay } from '@bloqz/relay';

// Create a new relay instance
const appRelay = createRelay();
```

### Type Safety

You can define the events available in your relay to get full TypeScript support.

```typescript
import { createRelay, RelayEventsMap } from '@bloqz/relay';

interface AppEvents extends RelayEventsMap {
  user: { type: 'login'; userId: string } | { type: 'logout' };
  cart: { type: 'add'; productId: string };
}

const appRelay = createRelay<AppEvents>();

// Types are checked here!
appRelay.emit('user', { type: 'login', userId: '123' });
```

### Emitting Events

You can emit an event to a specific topic using the `emit` method.

```typescript
appRelay.emit('user', { type: 'login', userId: '123' });
appRelay.emit('notifications', { type: 'new', message: 'Welcome!' });
```

### Listening for Events

You can listen for events on a specific topic or use the wildcard `*` to listen to all events. The `on` method returns an `unsubscribe` function.

#### Specific Topic

When listening to a specific topic, the handler receives the event object.

```typescript
const unsubscribe = appRelay.on('user', (event) => {
  console.log(`User event received: ${event.type}`);
});

// To stop listening
unsubscribe();
```

#### Wildcard

When listening with `*`, the handler receives both the topic name and the event object.

```typescript
const unsubscribe = appRelay.on('*', (topic, event) => {
  console.log(`Event '${event.type}' received on topic '${topic}'`);
});
```

### Disposing the Relay

When a relay is no longer needed, you can dispose of it to complete the underlying event stream and unsubscribe all listeners.

```typescript
appRelay.dispose();
```
