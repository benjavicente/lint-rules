# Avoid Explicit Injection Context

Avoid manual injection-context plumbing APIs when regular Angular DI context should be enough.

## What

This rule warns when code explicitly manages injection context through:

- `inject(Injector)`
- `runInInjectionContext(...)`
- `runInContext(...)`

By default, both patterns are blocked. You can configure them independently with booleans:

- `disallowInjectInjector` (default: `true`)
- `disallowRunInInjectionContext` (default: `true`)

## Why

Explicitly pulling `Injector` or manually running callbacks in an injection context often makes DI flow harder to reason about and easier to misuse. Favoring ambient Angular injection context keeps code simpler, more declarative, and less error-prone.

## Options

```json
{
  "disallowInjectInjector": true,
  "disallowRunInInjectionContext": true
}
```
