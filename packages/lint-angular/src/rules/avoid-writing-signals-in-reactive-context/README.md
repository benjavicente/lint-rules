# Avoid Writing Signals in Reactive Contexts

Avoid mutating signals from inside reactive callbacks such as `effect()`, `computed()`, and `linkedSignal()`.

## What

This rule reports writes to detected signals inside:

- `effect()`/`ng.effect()` callbacks
- `computed()`/`ng.computed()` callbacks
- `linkedSignal()` callback forms, including `linkedSignal({ computation: ... })`

It flags calls like:

- `mySignal.set(...)`
- `mySignal.update(...)`
- `mySignal.mutate(...)`

Signal detection is syntax-based (non-type-aware), inspired by the non-type-aware approach in `@angular-eslint`:

- variables initialized from `signal(...)`, `model(...)`, or `linkedSignal(...)`
- class fields initialized from those same creators

Options:

- `allowEffects` (default: `false`): allows writes in `effect()`
- `allowComputedAndLinkedSignals` (default: `false`): allows writes in `computed()` and `linkedSignal()`

## Why

Reactive callbacks are expected to derive state from reads. Writing to signals from inside them can create hidden loops, brittle data flow, and hard-to-debug updates.

## Options

```json
{
  "allowEffects": false,
  "allowComputedAndLinkedSignals": false
}
```
