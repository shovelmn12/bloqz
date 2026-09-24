---
"@bloqz/core": patch
"@bloqz/concurrency": patch
"@bloqz/react": patch
"@bloqz/relay": patch
"@bloqz/react-relay": patch
---

Packaging fixes:

- Published source maps embed their sources (`inlineSources`) instead of pointing at unpublished `src/` paths. `@bloqz/core` ships its `.map` files again.
- Exports maps are valid and consistent: a `"."` entry with `types` → `import` → `default`, plus `./package.json`. `main`, `module` and `types` are set, and so is `sideEffects: false`.
- Tarballs contain only `dist`, `README.md`, `CHANGELOG.md` and `package.json`.
