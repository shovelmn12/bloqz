import { describe, it, expect, vi } from 'vitest';
import { useCreateBloc } from './utils/create';
import { renderHook, act } from '@testing-library/react';

describe('useCreateBloc', () => {
  it('should create a bloc and close it on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useCreateBloc({
        initialState: { count: 0 },
        handlers: {},
      })
    );

    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);

    unmount();
    expect(bloc.isClosed).toBe(true);
  });
});
