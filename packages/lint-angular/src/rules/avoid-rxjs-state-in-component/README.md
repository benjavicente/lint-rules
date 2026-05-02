# Avoid RxJS State In Component

Avoid using RxJS `Subject`, `BehaviorSubject`, and `ReplaySubject` fields as local
state in Angular components and directives.

## What

Reports `@Component` and `@Directive` fields that use RxJS subjects for state.
`Subject`, `BehaviorSubject`, and `ReplaySubject` fields are all reported because
component-local event and state channels can usually be expressed with signals.

The rule also detects destroy-subject lifecycle management by pattern, not by
field name: if `ngOnDestroy` calls both `this.field.next()` and
`this.field.complete()` on the same RxJS `Subject` field, it reports a distinct
message recommending `takeUntilDestroyed()`.

## Why

Signals are the preferred primitive for component-local state. Use `signal()`,
`computed()`, or `linkedSignal()` for values, and use `takeUntilDestroyed()` for
Observable lifecycle cleanup.

## Options

```json
{}
```
