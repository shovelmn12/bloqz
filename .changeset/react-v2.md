---
"@bloqz/react": major
---

**Breaking:** `select`, `get`, `observe`, `add` and `close` are now pure factory functions instead of hidden hooks. They can be created at module scope or conditionally, and they return frozen strategy objects (`add()`/`close()` and a selector-less `select()` return shared singletons). A new strategy object is returned per call, and strategy fields are `readonly`.

**Breaking:** requires `@bloqz/core` 3 and declares `react >=18.0.0` as a peer dependency.

- `useCreateBloc` creates the bloc once per component. It no longer recreates it on every render when props are inline. Props are read only on creation. The new optional `deps` argument closes and recreates the bloc when a dependency changes.
- Lifecycle is StrictMode-safe: the bloc is closed exactly once on unmount, and StrictMode's double effect ends with an open bloc. The module-scope `process.env.NODE_ENV` read, which threw in browser ESM, is gone.
- The `useBloc` select strategy no longer re-subscribes on each render or loops with inline, object-returning selectors ("Maximum update depth exceeded"). Selections are deep-compared and referentially stable while equal.
- `useBloc` accepts nullable contexts (`Context<Bloc | undefined | null>`) through the new `BlocReactContext` type.
- `createBlocContext` and the strategy types (`SelectStrategy`, `GetStrategy`, `ObserveStrategy`, `AddStrategy`, `CloseStrategy`) are exported.
