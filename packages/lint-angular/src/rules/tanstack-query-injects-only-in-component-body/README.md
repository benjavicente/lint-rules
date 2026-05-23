# `tanstack-query-injects-only-in-component-body`

Require `injectQuery` and `injectMutation` from Angular TanStack Query packages
to be called only as direct class field initializers in Angular components and
directives.

## Why

Query and mutation inject helpers represent component/directive data concerns.
Keeping them on the class body makes ownership and lifecycle coupling explicit.

## Options

- `tanstackQuerySources` (default: `@tanstack/angular-query`, `@benjavicente/angular-query`, `@tanstack/angular-query-experimental`): module specifiers to treat as TanStack Query inject sources.

```json
{
  "tanstackQuerySources": [
    "@tanstack/angular-query",
    "@benjavicente/angular-query",
    "@tanstack/angular-query-experimental"
  ]
}
```
