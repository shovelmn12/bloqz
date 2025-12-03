# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
