# M – Error Boundary & Typed Errors

|  |  |
|---|---|
| **Goal** | Graceful failure + debuggability |
| **Primary Data** | React `error`, custom contract error types |
| **UI** | Generic "Oops" screen + Send Report button (Sentry?) |
| **Logic** | `componentDidCatch`/`getDerivedStateFromError`; map known errors; **Needs type migration after health/isDead bug fix** |
| **Edge Cases** | Error during error reporting |

**Design Ref Notes:**
*   Remote logging (e.g., Sentry) is Nice-to-have post-MVP.
*   Health/isDead bug fix requires frontend type updates (Issue #3).
