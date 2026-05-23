import { run } from "oxlint-vitest-rule-tester";
import tanstackQueryPreferQueryOptions from "./index.js";

await run({
  name: "tanstack-query-prefer-query-options",
  rule: tanstackQueryPreferQueryOptions,
  defaultFilename: "user-card.component.ts",
  valid: [
    'import { injectQuery, queryOptions } from "@tanstack/angular-query"; const userOptions = queryOptions({ queryKey: ["user"], queryFn }); class C { user = injectQuery(() => userOptions); }',
    'import { injectQuery } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ ...userOptions(this.id()), enabled: false })); }',
    'import { injectQuery, skipToken } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ ...userOptions(this.id()), queryFn: this.enabled() ? fetchUser : skipToken })); }',
    'import { injectQuery, skipToken } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ ...userOptions(this.id()), queryFn: skipToken })); }',
    'import { injectQueries } from "@tanstack/angular-query"; class C { queries = injectQueries(() => ({ queries: [userOptions, orgOptions] })); }',
    'import { QueryClient } from "@tanstack/angular-query"; const queryClient = new QueryClient(); queryClient.fetchQuery(userOptions); queryClient.getQueryData(userOptions.queryKey);',
    'import { inject } from "@angular/core"; import { QueryClient } from "@tanstack/angular-query"; class C { private queryClient = inject(QueryClient); load() { this.queryClient.invalidateQueries({ queryKey: userOptions.queryKey }); } }',
    'import { injectQuery } from "./query"; class C { query = injectQuery(() => ({ queryKey: ["user"], queryFn })); }',
  ],
  invalid: [
    {
      code: 'import { injectQuery } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ queryKey: ["user"], queryFn })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectInfiniteQuery } from "@tanstack/angular-query"; class C { user = injectInfiniteQuery(() => ({ queryKey: ["user"], queryFn, initialPageParam: 0 })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectQuery } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ ...userOptions(this.id()), queryKey: ["override"] })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectQuery } from "@tanstack/angular-query"; class C { user = injectQuery(() => ({ ...userOptions(this.id()), queryFn: () => fetchUser(this.id()) })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectQueries } from "@tanstack/angular-query"; class C { queries = injectQueries(() => ({ queries: [{ queryKey: ["user"], queryFn }] })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectQueries } from "@tanstack/angular-query"; class C { queries = injectQueries(() => ({ queries: ids.map((id) => ({ queryKey: ["user", id], queryFn: () => fetchUser(id) })) })); }',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { injectIsFetching } from "@tanstack/angular-query"; class C { fetching = injectIsFetching({ queryKey: ["user"] }); }',
      errors: ["preferQueryOptionsQueryKey"],
    },
    {
      code: 'import { QueryClient } from "@tanstack/angular-query"; const queryClient = new QueryClient(); queryClient.fetchQuery({ queryKey: ["user"], queryFn });',
      errors: ["preferQueryOptions"],
    },
    {
      code: 'import { QueryClient } from "@tanstack/query-core"; const queryClient = new QueryClient(); queryClient.getQueryData(["user"]);',
      errors: ["preferQueryOptionsQueryKey"],
    },
    {
      code: 'import { inject } from "@angular/core"; import { QueryClient } from "@tanstack/angular-query"; class C { private queryClient = inject(QueryClient); load() { this.queryClient.invalidateQueries({ queryKey: ["user"] }); } }',
      errors: ["preferQueryOptionsQueryKey"],
    },
  ],
});
