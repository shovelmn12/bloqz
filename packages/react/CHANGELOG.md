# Changelog

All notable changes to this project will be documented in this file.

The format is based on on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-19

### Changed
- **Refactor:** Unified `useBloc`, `useBlocState`, and `useBlocSelectState` into a single versatile `useBloc` hook.
- **Breaking:** Removed `useBlocState` and `useBlocSelectState` hooks. Please use `useBloc` with the `select` strategy instead.

### Added
- **New Strategies:** Added `select`, `get`, `observe`, `add`, and `close` helper functions to define how `useBloc` consumes the Bloc.
    - `select`: For reactive state selection (replaces `useBlocSelectState`).
    - `get`: For static access to Bloc values without subscriptions.
    - `observe`: For transforming and consuming the state stream (returns Observable).
    - `add`: Convenience helper to get the `add` method.
    - `close`: Convenience helper to get the `close` method.

## [1.0.4] - 2025-11-18

### Changed
- **Exports:** Refactored the main entry point (`index.ts`) to use explicit, named exports instead of wildcards. This improves tree-shaking for consumers.
- **Fixes:** Corrected type errors in `useCreateBloc` that arose from changes in the `@bloqz/core` package.

## [1.0.3] - 2025-10-23

### Changed
- Aligned all packages to version 1.0.3.

## [1.0.1] - 2025-10-22

### Added
- Added tests for the `useCreateBloc` hook.
