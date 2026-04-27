# Restrict Injectable `providedIn`

Allow only `'root'` or `'platform'` in `@Injectable({ providedIn: ... })`.

## What

This rule checks Angular `@Injectable` metadata and reports `providedIn` values that are not:

- `'root'`
- `'platform'`

It ignores `@Injectable()` declarations that do not declare `providedIn`.

## Why

Restricting service scope declarations to `root` and `platform` keeps DI behavior predictable and avoids mixed scoping patterns that are harder to reason about across large applications.

## Options

```json
{}
```
