# `tanstack-query-inlined-keys`

Require `queryKey` values inside `queryOptions()` and `infiniteQueryOptions()` to be inline array expressions.

## Why

Query keys are implementation details of an external-service contract. They should be defined in query options and read through the options object, not exported as separate key-builder APIs. Keeping keys inline in the options builder also improves type safety in cases where TanStack Query can attach richer types to the options result.

## Invalid

```ts
const userOptions = queryOptions({
  queryKey: userKey(id),
  queryFn: () => fetchUser(id),
});
```

```ts
const queryKey = ["user", id];

const userOptions = queryOptions({
  queryKey,
  queryFn: () => fetchUser(id),
});
```

## Valid

```ts
const userOptions = queryOptions({
  queryKey: ["user", id],
  queryFn: () => fetchUser(id),
});
```

```ts
const userOptions = queryOptions({
  queryKey: ["user", getUserId()],
  queryFn: () => fetchUser(id),
});
```
