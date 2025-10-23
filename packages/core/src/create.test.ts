import { describe, it, expect, vi } from 'vitest';
import { createBloc } from './utils/create';
import { firstValueFrom, skip } from 'rxjs';

describe('createBloc', () => {
  it('should create a bloc with the correct initial state', () => {
    const initialState = { count: 0 };
    const bloc = createBloc({
      initialState,
      handlers: {},
    });

    expect(bloc.state).toEqual(initialState);
  });

  it('should process events', async () => {
    const initialState = { count: 0 };
    const bloc = createBloc({
      initialState,
      handlers: {
        INCREMENT: (event, { update }) => {
          update((state) => ({ count: state.count + 1 }));
        },
      },
    });

    bloc.add({ type: 'INCREMENT' });

    await firstValueFrom(bloc.state$.pipe(skip(1)));

    expect(bloc.state).toEqual({ count: 1 });
  });
});
