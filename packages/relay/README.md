# @bloqz/relay

The `@bloqz/relay` package provides a lightweight, framework-agnostic event bus for enabling communication between different parts of an application. It uses a topic-based subscription model, making it a flexible solution for decoupled architectures.

## Core Concepts

- **Relay**: An event bus that allows for emitting and listening to events on named topics.
- **Topics**: Named channels for events, allowing for targeted communication.
- **Events**: The data payload associated with a topic.

## Installation

This package is part of the Bloqz monorepo. To use it, you will need to add it as a dependency in your `package.json`:

```json
"dependencies": {
  "@bloqz/relay": "1.0.0"
}
```

## Usage

### Creating a Relay

The primary export of this package is the `createRelay` function. You can create a new relay instance as follows:

```typescript
import { createRelay } from '@bloqz/relay';

// Define a map of your events
type AppEvents = {
  'auth:login': { userId: string };
  'auth:logout': undefined;
  'notifications:new': { message: string };
};

// Create a new relay instance
const appRelay = createRelay<AppEvents>();
```

### Emitting Events

You can emit an event to a specific topic using the `emit` method:

```typescript
appRelay.emit('auth:login', { userId: '123' });
appRelay.emit('notifications:new', { message: 'Welcome!' });
```

### Listening to Events

You can listen to events on a specific topic using the `on` method. It returns an `unsubscribe` function.

```typescript
const unsubscribe = appRelay.on('auth:login', (event) => {
  // event is correctly typed as { userId: string }
  console.log('User logged in:', event.userId);
});

// To stop listening
unsubscribe();
```

### Wildcard Subscriptions

You can also listen to all events on the relay by using the wildcard topic `'*'`:

```typescript
const unsubscribeAll = appRelay.on('*', (topic, event) => {
  console.log(`Received event on topic '${topic}':`, event);
});
```

### Framework Integration

This package is framework-agnostic. For integration with specific frameworks, such as React, a separate package will be provided (e.g., `@bloqz/react-relay`).
