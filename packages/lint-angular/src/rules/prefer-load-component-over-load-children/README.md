# Prefer `loadComponent` over `loadChildren`

Disallow `loadChildren` in safely-detected exported `Routes` arrays.

## What

This rule checks only route arrays declared with this strict pattern:

- `export const <name>: Routes = [...]`

Inside those arrays, it reports any `loadChildren` route property and encourages `loadComponent` for lazy-loaded standalone components.

## Why

When teams standardize on standalone route components, `loadChildren` can keep legacy route-module patterns around. Enforcing `loadComponent` keeps lazy loading style consistent and easier to migrate.

## Options

```json
{}
```

## Limits

This rule is intentionally conservative and non-type-aware. It does not lint other route declarations such as:

- non-exported route constants
- arrays without `: Routes`
- `Route[]` or other type aliases
