# AGENTS.md

## Project

pnpm monorepo for **bloqz.js** — a functional, RxJS-based Bloc state-management library. All code lives in `packages/*`. No app; each package is published to npm as `@bloqz/*`.

## Commands (from repo root)

- Install: `pnpm install`
- Build all (topological order): `pnpm -r build`
- Test all: `pnpm -r test` (each package: `vitest --run`)
- Test one package: `pnpm --filter @bloqz/core test` (or run vitest inside the package dir)
- Publish all: `pnpm -r publish`
- **No lint or typecheck scripts exist.** Type checking = `tsc -p <pkg>/tsconfig.build.json` (run via build). Root `package.json` scripts are the only entrypoints.

## Gotchas

- **`.js` extension on relative imports is mandatory.** All source uses NodeNext ESM style (`import ... from "./utils/create.js"`). Omit the extension and TS/Vitest will fail. This applies to test files too.
- **Tests import from source `src/index.js`, not `dist`.** Unit-testing a package does not require building it — except cross-package imports (below).
- **Cross-package runtime/type deps require upstream `dist/`:** react tests `import { createBloc } from "@bloqz/core"` and concurrency/react typecheck against `@bloqz/core`'s `.d.ts`; react-relay depends on `@bloqz/relay`. Build the dependency first (`pnpm --filter @bloqz/core build`) before running those tests or building dependents. `pnpm -r build` handles this order automatically.
- **`pnpm` 11 ignores build scripts unless allowed**: `allowBuilds: { esbuild: true }` is set in `pnpm-workspace.yaml`. Without it, `pnpm --filter ...` fails with `ERR_PNPM_IGNORED_BUILDS`.
- **React/react-dom dev deps are pinned to exact `19.2.1`** in both `@bloqz/react` and `@bloqz/react-relay` — they must match or jsdom tests crash (`Cannot read properties of undefined (reading 'S')`).
- **Test directories are inconsistent**: some packages use `__tests__/`, others `tests/`. Vitest picks up both. Keep tests inside the package you're editing.
- **`dist/` is gitignored** — build output is never committed; required before `publish`.
- Per-package `package-lock.json` files are stale npm artifacts; the real lockfile is the root `pnpm-lock.yaml`.
- **React package tests need `jsdom`** (set in `packages/react/vitest.config.ts`, `environment: 'jsdom'`). Core/concurrency/relay use plain `node` env.
- **No CI workflows, no pre-commit hooks** in the repo.

## Architecture (non-obvious from filenames)

- `@bloqz/core` — `createBloc` (`src/utils/create.ts`) drives everything: handlers map event `type` strings → functions, matched via predicate, grouped by `groupBy`, then run through a per-group concurrency `EventTransformer` (default `mergeMap`/concurrent). `createPipeBloc` wraps an external `state$` source; its `add` is a no-op.
- `@bloqz/concurrency` — just 4 thin wrappers over RxJS operators: `sequential`(concatMap), `concurrent`(mergeMap), `restartable`(switchMap), `droppable`(exhaustMap).
- `@bloqz/react` — `useCreateBloc` (memoizes instance, auto-closes), `useBloc` + strategy helpers `select`/`get`/`observe`/`add`/`close`. `useBloc`'s select path is intricate (`useSyncExternalStore` + ref); read `src/utils/use.ts` before touching it.
- `@bloqz/relay` — RxJS event bus (`createRelay`): `emit(topic, event)`, `on(topic, cb)` returns an unsubscribe fn, `on("*", cb)` wildcard. No predicate-based filtering despite `RelayPredicate` being exported.
- `@bloqz/react-relay` — thin `RelayProvider` + `useRelay`; re-exports all of `@bloqz/relay`.

## Conventions

- Default event transformer in core is `concurrent` (mergeMap) when a handler is given as a plain function; object form `{ handler, transformer? }` overrides it.
- `context.value` in `BlocContext` is a **frozen snapshot** taken when the handler starts executing — it does not change during async handler execution even if other handlers update state concurrently. Use functional `update(s => ...)` if you need the freshest state.
- `createPipeBloc` takes an **optional** `initialState`; if omitted, state is `undefined` until the source emits.
- `State` type in `packages/core/src/models/state.ts` is an fp-ts `Option`-based RemoteData-like async-state union (`init`/`loading`/`data`/`error`).
- The `handlers` object (upfront registration) is the only event-handler API — there is no `bloc.on(...)` method. If docs/JSDoc mention `on`, they're stale; trust the source.
