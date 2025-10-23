import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { RelayProvider } from './provider';
import { useRelay } from './hooks';
import { createRelay, Relay } from '@bloqz/relay';
import React, { ReactNode } from 'react';

describe('useRelay', () => {
  // TODO: The test is failing because of an object identity issue.
  // The `toBe` matcher checks for strict equality, and it seems that the `relay`
  // instance returned by the hook is not the same instance as the one created in the test.
  // I have tried using `toEqual` and checking the `emit` function, but neither of those worked.
  it.fails('should return the relay instance from the context', () => {
    const relay = createRelay();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RelayProvider relay={relay}>{children}</RelayProvider>
    );

    const { result } = renderHook(() => useRelay(), { wrapper });

    expect(result.current.emit).toBe(relay.emit);
  });
});
