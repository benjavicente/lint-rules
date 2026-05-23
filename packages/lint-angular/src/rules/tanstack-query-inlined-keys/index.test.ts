import { run } from "oxlint-vitest-rule-tester";
import tanstackQueryInlinedKeys from "./index.js";

await run({
  name: "tanstack-query-inlined-keys",
  rule: tanstackQueryInlinedKeys,
  defaultFilename: "queries.ts",
  valid: [
    'import { queryOptions } from "@tanstack/angular-query"; const userOptions = queryOptions({ queryKey: ["user", id()], queryFn });',
    'import { queryOptions } from "@tanstack/angular-query"; const userOptions = queryOptions({ queryKey: ["user"] as const, queryFn });',
    'import { infiniteQueryOptions } from "@tanstack/angular-query"; const usersOptions = infiniteQueryOptions({ queryKey: ["users", filters()], queryFn, initialPageParam: 0 });',
    'import * as query from "@tanstack/angular-query"; const userOptions = query.queryOptions({ queryKey: ["user", 2, 3], queryFn });',
    {
      code: 'import { queryOptions } from "@tanstack/custom-query"; const userOptions = queryOptions({ queryKey: ["user", id], queryFn });',
      options: [{ tanstackQuerySources: ["@tanstack/custom-query"] }],
    },
  ],
  invalid: [
    {
      code: 'import { queryOptions } from "@tanstack/angular-query"; const userOptions = queryOptions({ queryKey: userKey(id), queryFn });',
      errors: ["inlinedKeys"],
    },
    {
      code: 'import { queryOptions } from "@tanstack/angular-query"; const userOptions = queryOptions({ queryKey: getUserKey(), queryFn });',
      errors: ["inlinedKeys"],
    },
    {
      code: 'import { queryOptions } from "@tanstack/angular-query"; const queryKey = ["user", id]; const userOptions = queryOptions({ queryKey, queryFn });',
      errors: ["inlinedKeys"],
    },
    {
      code: 'import { infiniteQueryOptions } from "@tanstack/angular-query"; const usersOptions = infiniteQueryOptions({ queryKey: usersKey(filters()), queryFn, initialPageParam: 0 });',
      errors: ["inlinedKeys"],
    },
    {
      code: 'import * as query from "@tanstack/angular-query"; const userOptions = query.queryOptions({ queryKey: userKey(id), queryFn });',
      errors: ["inlinedKeys"],
    },
    {
      code: 'import { queryOptions } from "@tanstack/custom-query"; const userOptions = queryOptions({ queryKey: userKey(id), queryFn });',
      options: [{ tanstackQuerySources: ["@tanstack/custom-query"] }],
      errors: ["inlinedKeys"],
    },
  ],
});
