import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRelay, Relay, EventsMap } from '@bloqz/relay';
import { RelayProvider, useRelay } from './';
import '@testing-library/jest-dom';

// Define a simple event map for testing
type TestEvents = {
  'test-event': { message: string };
};

describe('RelayProvider and useRelay', () => {
  it('should provide a default relay instance to a component', () => {
    let relayInstance: Relay<EventsMap> | null = null;

    const TestComponent = () => {
      relayInstance = useRelay();
      return null;
    };

    render(
      <RelayProvider>
        <TestComponent />
      </RelayProvider>
    );

    expect(relayInstance).toBeDefined();
    expect(relayInstance).not.toBeNull();
  });

  it('should provide a custom relay instance', () => {
    const customRelay = createRelay<TestEvents>();
    const mockEmit = vi.spyOn(customRelay, 'emit');

    const ConsumerComponent = () => {
      const relay = useRelay() as Relay<TestEvents>;

      // Correctly wrap the side-effect in a useEffect hook
      React.useEffect(() => {
        relay.emit('test-event', { message: 'hello' });
      }, [relay]);

      return null;
    };

    render(
      <RelayProvider create={() => customRelay}>
        <ConsumerComponent />
      </RelayProvider>
    );

    expect(mockEmit).toHaveBeenCalledWith('test-event', { message: 'hello' });
  });

  it('should allow a component to consume events', async () => {
    const relay = createRelay<TestEvents>();

    const EventDisplay = () => {
      const [message, setMessage] = React.useState('');
      const relayInstance = useRelay() as Relay<TestEvents>;

      React.useEffect(() => {
        const unsubscribe = relayInstance.on('test-event', (e) => {
          setMessage(e.message);
        });
        return unsubscribe;
      }, [relayInstance]);

      return <div>{message}</div>;
    };

    render(
      <RelayProvider create={() => relay}>
        <EventDisplay />
      </RelayProvider>
    );

    expect(screen.queryByText('world')).not.toBeInTheDocument();

    act(() => {
      relay.emit('test-event', { message: 'world' });
    });

    expect(await screen.findByText('world')).toBeInTheDocument();
  });
});
