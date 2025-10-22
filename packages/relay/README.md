# @bloqz/relay

The `@bloqz/relay` package provides a lightweight, RxJS-powered event bus for enabling communication between different parts of an application. It uses a flexible subscription model that supports both simple string patterns and advanced predicate functions, making it a powerful solution for decoupled architectures.

## Core Concepts

- **Relay**: An event bus that allows for emitting and listening to events.
- **Topics**: Named channels for events (e.g., 'user', 'cart'), allowing for targeted communication.
- **Events**: The data payload associated with a topic, which must have a `type` property.
- **Pattern Matching**: A simple yet powerful syntax for subscribing to events based on their topic and type.

## Installation

This package is part of the Bloqz monorepo. To use it, add it as a dependency in your `package.json`:

```json
"dependencies": {
  "@bloqz/relay": "1.0.0"
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

### Emitting Events

You can emit an event to a specific topic using the `emit` method. The event payload must be an object with a `type` property.

```typescript
appRelay.emit('user', { type: 'login', userId: '123' });
appRelay.emit('notifications', { type: 'new', message: 'Welcome!' });
```

### Listening with String Patterns

You can listen for events using a string pattern with the `on` method. This is the most common way to subscribe. The method returns an `unsubscribe` function.

```typescript
// Listen for login and logout events on the 'user' topic
const unsubscribe = appRelay.on('user.{login|logout}', (topic, event) => {
  console.log(`Received event '${event.type}' on topic '${topic}'`);
});

// To stop listening
unsubscribe();
```

### Listening with a Predicate Function

For more complex scenarios, you can use a predicate function to filter events. The predicate receives the topic and event and should return `true` if the handler should be executed.

```typescript
const unsubscribe = appRelay.on((topic, event) => {
  return topic === 'user' && event.type === 'login';
}, (topic, event) => {
  console.log('User logged in:', event);
});
```

### Pattern Matching Syntax

The pattern matching syntax provides a concise way to subscribe to events:

| Pattern                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `*`                     | Matches any topic and any event type.                 |
| `user`                  | Matches any event on the `user` topic.                |
| `user|cart`             | Matches any event on the `user` or `cart` topics.     |
| `*.login`               | Matches `login` events on any topic.                  |
| `user.{login|logout}`   | Matches `login` or `logout` events on the `user` topic. |

### Disposing the Relay

When a relay is no longer needed, you can dispose of it to complete the underlying event stream and unsubscribe all listeners.

```typescript
appRelay.dispose();
```
