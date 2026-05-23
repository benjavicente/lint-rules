# `tanstack-query-prefer-query-options`

Prefer `queryOptions()` or `infiniteQueryOptions()` for TanStack Query query definitions.

## Why

Query options define the contract with external services: the cache key, fetcher, parameters, stale behavior, and the shape callers depend on. Keeping that contract in a centralized options builder makes it reusable across components, prefetching, cache reads, invalidation, and tests without duplicating service details.

Object spread is allowed when reusing options and changing runtime-only flags:

```ts
injectQuery(() => ({
  ...userOptions(id),
  enabled: false,
}));
```

Disabling a query with `skipToken` is also allowed when it overrides a spread options object:

```ts
injectQuery(() => ({
  ...userOptions(id),
  queryFn: skipToken,
}));
```
