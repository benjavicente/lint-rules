# `vitest-no-incompatible-angular-testing-apis`

Disallow Zone.js-based async testing helpers from `@angular/core/testing`:

- `discardPeriodicTasks`
- `fakeAsync`
- `flush`
- `flushMicrotasks`
- `resetFakeAsyncZone`
- `tick`
- `waitForAsync`

Angular documents these APIs as Zone.js-based, and Angular's Vitest test runner does not apply Zone.js patches. Prefer native async tests and Vitest timer helpers such as `vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`, and `vi.runAllTimersAsync()` instead.

## Invalid

```ts
import {
  discardPeriodicTasks,
  fakeAsync,
  flush,
  flushMicrotasks,
  resetFakeAsyncZone,
  tick,
  waitForAsync,
} from "@angular/core/testing";
```

```ts
import * as testing from "@angular/core/testing";

it(
  "works",
  testing.fakeAsync(() => {
    testing.tick(100);
  }),
);
```

## Valid

```ts
import { TestBed } from "@angular/core/testing";
```
