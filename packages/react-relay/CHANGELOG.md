# Changelog

All notable changes to this project will be documented in this file.

The format is based on on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-08-13

### Fixed
- The `useRelay` test now passes a `create` factory to `RelayProvider` and succeeds (previously it used an ignored `relay` prop and was marked as a known failure).

### Changed
- Pinned the `react`/`react-dom` dev dependencies to the exact version `19.2.1`.
- Fixed the README example to match the current `on` handler signature.

## [2.0.0] - 2026-02-13

### Changed
- Improved JSDoc documentation across the package.
- Fixed an incorrect import of `RelayEventsMap`.

## [1.2.0] - 2025-12-03

### Changed
- Synchronize all packages to version 1.2.0.

## [1.1.5] - 2025-12-03

### Changed
- Synchronize relay packages to version 1.1.5.

## [1.1.4] - 2025-12-03

### Changed
- Expose "@bloqz/relay".

## [1.1.3] - 2025-12-03

### Changed
- Synchronize all packages to version 1.1.3.

## [1.1.2] - 2025-12-03

### Changed
- Updated supported React versions to include React 18 and 19.

## [1.0.4] - 2025-11-18

### Changed
- **Exports:** Refactored the main entry point (`index.ts`) to use explicit, named exports instead of wildcards. This improves tree-shaking for consumers.

## [1.0.3] - 2025-10-23

### Changed
- Aligned all packages to version 1.0.3.

## [1.0.2] - 2025-10-22

### Added
- Added tests for the `useRelay` hook.
