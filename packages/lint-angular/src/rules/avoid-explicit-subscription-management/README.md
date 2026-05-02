# Avoid Explicit Subscription Management

Avoid storing and manually managing RxJS `Subscription` objects in Angular components,
directives, and services.

## What

Reports Angular `@Component`, `@Directive`, and `@Injectable` classes when they:

- create `new Subscription()`
- store `Subscription` references in fields or local variables
- call unmanaged `.subscribe(...)` on fields or local variables that are statically known
  to be RxJS `Observable`/`Subject` instances
- add subscriptions to a `Subscription` container
- manually call `.unsubscribe()`

`observable.pipe(takeUntilDestroyed()).subscribe(...)` is allowed because Angular owns
the lifecycle cleanup.

## Why

Manual subscription bags are easy to leak or over-clean. Prefer `takeUntilDestroyed`
for effects, `toSignal` for template/state values, or `firstValueFrom` when a single
async value should become a promise.

## Options

```json
{}
```
