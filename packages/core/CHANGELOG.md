# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.0.0] - 2026-08-13

### Changed
- **Breaking:** `BlocContext.value` is now a frozen snapshot taken when the handler starts executing. It no longer changes while an async handler runs, even if other handlers update state concurrently. Use the functional `update(s => ...)` form when you need the freshest state.

### Added
- `createPipeBloc` `initialState` is now optional. When omitted, state is `undefined` until the source emits its first value.

### Fixed
- `generateShortID` now uses `Date.now()` instead of `performance.now()`, which is unavailable in some SSR/older Node environments.

## [1.2.1] - 2025-12-03

### Changed
- **Breaking:** Renamed `EMPTY_BLOC` to `EMPTY` in exports.

## [1.2.0] - 2025-12-03

### Changed
- Synchronize all packages to version 1.2.0.

## [1.1.4] - 2025-12-03

### Changed
- Exposes "EventHandlersObject".

## [1.1.3] - 2025-12-03

### Changed
- Synchronize all packages to version 1.1.3.

## [1.1.2] - 2025-12-03

### Changed
- Synchronize all packages to version 1.1.2.

## [1.1.1] - 2025-12-03

### Changed
- Synchronize all packages to version 1.1.1.

## [1.0.4] - 2025-11-18

### Changed
- **Build Process:** Replaced the `rolldown` bundler with `tsc` to ship individual ES modules instead of a single bundle. This significantly improves tree-shaking for consumers.
- **Package Size:** Optimized the package size by defining an explicit public API and removing the bundler overhead. The unpacked size was reduced from ~202 kB to ~55 kB.

## [1.0.3] - 2025-10-23

### Changed
- Aligned all packages to version 1.0.3.

## [1.0.1] - 2025-10-22

### Added
- Added tests for the `createBloc` function.
