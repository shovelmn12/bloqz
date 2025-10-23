import { describe, it, expect, vi } from 'vitest';
import { createRelay } from './create';

describe('createRelay', () => {
  it('should emit and receive events', () => {
    const relay = createRelay();
    const handler = vi.fn();

    relay.on('*', handler);
    relay.emit('test', { type: 'test' });

    expect(handler).toHaveBeenCalledWith('test', { type: 'test' });
  });
});
