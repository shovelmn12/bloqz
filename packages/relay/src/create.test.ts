import { describe, it, expect, vi } from 'vitest';
import { createRelay } from './create';

// Define a simple event map for testing
type TestEvents = {
  'test-topic': { data: string };
  'another-topic': { value: number };
};

describe('createRelay', () => {
  it('should create a new relay instance', () => {
    const relay = createRelay<TestEvents>();
    expect(relay).toBeDefined();
    expect(relay.emit).toBeInstanceOf(Function);
    expect(relay.on).toBeInstanceOf(Function);
    expect(relay.dispose).toBeInstanceOf(Function);
  });

  it('should emit and receive events on a specific topic', () => {
    const relay = createRelay<TestEvents>();
    const handler = vi.fn();
    const testEvent = { data: 'test-data' };

    relay.on('test-topic', handler);
    relay.emit('test-topic', testEvent);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(testEvent);
  });

  it('should not call handler for a different topic', () => {
    const relay = createRelay<TestEvents>();
    const handler = vi.fn();

    relay.on('test-topic', handler);
    relay.emit('another-topic', { value: 123 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should call wildcard handler for any event', () => {
    const relay = createRelay<TestEvents>();
    const wildcardHandler = vi.fn();
    const testEvent1 = { data: 'test-data' };
    const testEvent2 = { value: 123 };

    relay.on('*', wildcardHandler);
    relay.emit('test-topic', testEvent1);
    relay.emit('another-topic', testEvent2);

    expect(wildcardHandler).toHaveBeenCalledTimes(2);
    expect(wildcardHandler).toHaveBeenCalledWith('test-topic', testEvent1);
    expect(wildcardHandler).toHaveBeenCalledWith('another-topic', testEvent2);
  });

  it('should stop receiving events after unsubscribing', () => {
    const relay = createRelay<TestEvents>();
    const handler = vi.fn();
    const testEvent = { data: 'test-data' };

    const unsubscribe = relay.on('test-topic', handler);
    relay.emit('test-topic', testEvent);
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    relay.emit('test-topic', testEvent);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not receive any more events after dispose is called', () => {
    const relay = createRelay<TestEvents>();
    const handler = vi.fn();
    const wildcardHandler = vi.fn();

    relay.on('test-topic', handler);
    relay.on('*', wildcardHandler);

    relay.dispose();

    relay.emit('test-topic', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
    expect(wildcardHandler).not.toHaveBeenCalled();
  });
});
