---
"@bloqz/concurrency": major
---

**Breaking:** the `@bloqz/core` peer dependency now requires `^3.0.0`. The transformers (`sequential`, `concurrent`, `restartable`, `droppable`) are unchanged. With core 3, runs that `restartable()` or `droppable()` cancel get an aborted `context.signal` and can no longer write state.
