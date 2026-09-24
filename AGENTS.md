# AGENTS.md

## Project

pnpm monorepo for **bloqz.js** — a functional, RxJS-based Bloc state-management library. All code lives in `packages/*`. No app; each package is published to npm as `@bloqz/*` (ESM-only). The root package is `private: true`.

## Commands (from repo root)

- Install: `pnpm install` (CI uses `pnpm install --frozen-lockfile`; pnpm version is pinned via root `packageManager`)
- Build all (topological order): `pnpm -r build` (each package: `tsc -p tsconfig.build.json`)
- Typecheck all: `pnpm typecheck` → each package's `tsc -p tsconfig.test.json` (src + tests, `noEmit`). Needs upstream `dist/` (run `pnpm -r build` first).
- Test all: `pnpm -r test` (each package: `vitest --run`)
- Test one package: `pnpm --filter @bloqz/core test` (or run vitest inside the package dir)
- Package lint: `pnpm lint:pkg` → `publint --strict` + `attw --pack . --profile esm-only` on every package. Needs a build first.
- Release notes: `pnpm changeset` adds a changeset; `pnpm changeset version` bumps versions + CHANGELOGs. Publish: `pnpm -r publish` (converts `workspace:^` to real ranges).
- There is no code linter/formatter (no ESLint/Prettier).

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on PRs, in this order: frozen install → `pnpm -r build` → `pnpm typecheck` → `pnpm -r test` → `pnpm lint:pkg` → Node ESM smoke import of `dist/index.js` for core, concurrency and relay. No pre-commit hooks.

## Gotchas

- **`.js` extension on relative imports is mandatory.** All source uses NodeNext ESM (`import ... from "./utils/create.js"`); this applies to test files too.
- **TS config is shared**: root `tsconfig.base.json` (strict, `noImplicitAny`, `module`/`moduleResolution: nodenext`, ES2022, declaration + source maps with `inlineSources`). Each package's `tsconfig.json` only sets `rootDir`/`outDir`/`include` (+ `jsx: react-jsx` for react/react-relay, `stripInternal` for core). `tsconfig.build.json` builds; `tsconfig.test.json` type-checks src + tests.
- **Tests import from source (`../src/...`), not `dist`.** Unit-testing a package does not require building it — except cross-package imports (below).
- **Cross-package imports resolve to upstream `dist/`:** react and concurrency tests/types import `@bloqz/core`; react-relay imports `@bloqz/relay`. Build the dependency first (`pnpm --filter @bloqz/core build`) or just `pnpm -r build`. (react-relay's vitest config aliases `@bloqz/relay` to its `src` at runtime, but typechecking still uses relay's `dist` types.) core's `tests/dist-esm.test.ts` is skipped when `dist/` is missing.
- **`pnpm` ignores dependency build scripts unless allowed**: `allowBuilds: { esbuild: true }` is set in `pnpm-workspace.yaml`. Without it, `pnpm --filter ...` fails with `ERR_PNPM_IGNORED_BUILDS`.
- **React/react-dom dev deps are pinned to exact `19.2.1`** in both `@bloqz/react` and `@bloqz/react-relay` — they must match or jsdom tests crash (`Cannot read properties of undefined (reading 'S')`). `@types/react-dom` is kept on `~19.2` so its `@types/react` peer matches. The published `react` peer is `>=18.0.0`.
- **Tests live in `tests/`** in every package (`*.test.ts(x)`; type-only tests are `*.test-d.ts(x)`, run by vitest typecheck in relay/react-relay). Keep tests inside the package you're editing.
- **`dist/` is gitignored** — build output is never committed; required before `publish`. Tarballs contain only `dist` (incl. `.map` files), `README.md`, `CHANGELOG.md`, `package.json`.
- Only the root `pnpm-lock.yaml` is used; `package-lock.json` is gitignored.
- **React package tests need `jsdom`** (`environment: 'jsdom'` in `packages/react` and `packages/react-relay` vitest configs). Core/concurrency/relay use plain `node` env.
- Every package has the same `exports` shape (`"."` with `types` → `import` → `default`, plus `./package.json`) and `sideEffects: false`. Keep it that way; `pnpm lint:pkg` checks it.

## Architecture (non-obvious from filenames)

- `@bloqz/core` — `createBloc` (`src/utils/create.ts`) drives everything: the `handlers` object is turned into a `Map` keyed by event `type`; events are looked up by `type`, grouped by `groupBy` (unhandled events share a `Symbol` key, get a `console.warn` and are dropped), then run through a per-group concurrency `EventTransformer` (default `mergeMap`/concurrent). Each handler run is wrapped in an Observable with its own `AbortController`: when the transformer unsubscribes (switchMap superseding it, or `close()`), `context.signal` aborts and that run's `update` becomes a no-op. `createPipeBloc` wraps an external `source$`; its `add` is a no-op and source errors go to `errors$` with `event: undefined`. `rxjs` is a regular dependency (no fp-ts).
- `@bloqz/concurrency` — just 4 thin wrappers over RxJS operators: `sequential`(concatMap), `concurrent`(mergeMap), `restartable`(switchMap), `droppable`(exhaustMap). Peer: `@bloqz/core` ^3.
- `@bloqz/react` — `useCreateBloc(props, deps?)` creates the Bloc once per component (props read only on creation; `deps` recreates), closes it on unmount, StrictMode-safe. `useBloc(context, strategy?)` accepts `Context<Bloc | undefined | null>` (`BlocReactContext`) and throws if no Bloc. Strategy helpers `select`/`get`/`observe`/`add`/`close` are **pure factories, not hooks**. `useBloc`'s select path is intricate (`useSyncExternalStore` + cached, `isEqual`-compared snapshot); read `src/utils/use.ts` before touching it.
- `@bloqz/relay` — RxJS event bus (`createRelay({ onError? })`): `emit(topic, event)`, `on(topic, cb)` returns an unsubscribe fn, `on("*", (topic, event) => ...)` wildcard, `dispose()`, `isDisposed`. Throwing subscribers are isolated (errors go to `onError` or `console.error`). Use after dispose warns and no-ops. `RelayPredicate` is deprecated/unused — there is no predicate-based filtering.
- `@bloqz/react-relay` — `RelayProvider` creates its relay once per mount (optional `create` prop) and **disposes it on unmount** (deferred by a microtask for StrictMode). `useRelay()` **throws outside a `RelayProvider`** (`RelayContext` defaults to `null`). `useRelayEvent(topic, handler)` subscribes for the component's lifetime. Re-exports all of `@bloqz/relay`.

## Conventions

- Default event transformer in core is `concurrent` (mergeMap) when a handler is given as a plain function; object form `{ handler, transformer? }` overrides it.
- `BlocContext` = `{ id, value, update, signal }`. `context.value` is a **frozen snapshot** taken when the handler starts executing — it does not change during async handler execution. Use functional `update(s => ...)` for the freshest state. `context.signal` aborts when the run is cancelled or the bloc closes; pass it to `fetch` etc.
- `errors$` emits `{ event: Event | undefined, error }` and `ErrorHandler` is `(error, event: Event | undefined) => void` — `event` is `undefined` for pipeline/source errors.
- `createPipeBloc` takes an **optional** `initialState`; if omitted, state is `undefined` until the source emits.
- `State<T, E, P = T | undefined>` in `packages/core/src/models/state.ts` is a RemoteData-like async-state union (`init`/`loading`/`data`/`error`); `P` is the representation of the previous value carried by `loading`/`error` (e.g. `Option<T>` for fp-ts users). No fp-ts dependency.
- The `handlers` object (upfront registration) is the only event-handler API — there is no `bloc.on(...)` method. If docs/JSDoc mention `on`, they're stale; trust the source.
- Every user-facing change needs a changeset (`pnpm changeset`); commit messages follow Conventional Commits.
