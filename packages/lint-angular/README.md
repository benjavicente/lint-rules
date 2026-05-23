# `@benjavicente/lint-angular`

Opinated Oxlint/ESLint-compatible plugin for Angular project rules.

## Rules

| Rule                                                                                                          | Default | Fixable | Description                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------- | --------------------------------------------------------------------------------------------- |
| [`rules-of-inject`](./src/rules/rules-of-inject/)                                                             | ✅      |         | Restrict `inject()` usage to valid Angular injection contexts.                                |
| [`avoid-explicit-injection-context`](./src/rules/avoid-explicit-injection-context/)                           | ✅      |         | Avoid explicit injection-context APIs such as `inject(Injector)` and `runInInjectionContext`. |
| [`avoid-explicit-subscription-management`](./src/rules/avoid-explicit-subscription-management/)               | ✅      |         | Avoid storing and manually managing RxJS subscriptions in Angular classes.                    |
| [`avoid-inappropriate-intimacy`](./src/rules/avoid-inappropriate-intimacy/)                                   | ✅      |         | Avoid passing Angular component, directive, and service instances as function arguments.      |
| [`avoid-ng-modules`](./src/rules/avoid-ng-modules/)                                                           | ✅      |         | Avoid NgModules in favor of standalone Angular APIs.                                          |
| [`avoid-rxjs-state-in-component`](./src/rules/avoid-rxjs-state-in-component/)                                 | ✅      |         | Avoid RxJS subjects for component and directive-local state.                                  |
| [`avoid-writing-signals-in-reactive-context`](./src/rules/avoid-writing-signals-in-reactive-context/)         | ✅      |         | Avoid writing to signals from reactive Angular contexts.                                      |
| [`class-member-order`](./src/rules/class-member-order/)                                                       | ✅      |         | Enforce a consistent member order for Angular classes.                                        |
| [`class-matches-filename`](./src/rules/class-matches-filename/)                                               | ✅      |         | Require Angular class names to match component, directive, and service filenames.             |
| [`component-resource-filenames`](./src/rules/component-resource-filenames/)                                   | ✅      |         | Require component resource filenames to match the component TypeScript filename.              |
| [`decorator-filename-suffix`](./src/rules/decorator-filename-suffix/)                                         | ✅      |         | Require Angular decorators to be declared in files with matching filename suffixes.           |
| [`no-manual-change-detection`](./src/rules/no-manual-change-detection/)                                       | ✅      |         | Avoid manual Angular change detection through `ChangeDetectorRef`.                            |
| [`no-resource-api`](./src/rules/no-resource-api/)                                                             | ✅      |         | Avoid Angular resource APIs for server state.                                                 |
| [`no-route-resolvers`](./src/rules/no-route-resolvers/)                                                       | ✅      |         | Avoid Angular route resolvers for data loading.                                               |
| [`no-ui-inheritance`](./src/rules/no-ui-inheritance/)                                                         | ✅      |         | Avoid inheritance for Angular components and directives.                                      |
| [`prefer-private-elements`](./src/rules/prefer-private-elements/)                                             | ✅      | ✅      | Prefer ECMAScript private elements over TypeScript `private` members.                         |
| [`prefer-load-component-over-load-children`](./src/rules/prefer-load-component-over-load-children/)           | ✅      |         | Prefer `loadComponent` for lazy routes that load a standalone component.                      |
| [`prefer-style-url`](./src/rules/prefer-style-url/)                                                           | ✅      | ✅      | Prefer `styleUrl` when a component has exactly one stylesheet.                                |
| [`public-component-interface`](./src/rules/public-component-interface/)                                       | ✅      | ✅      | Keep component and directive signal interfaces public while hiding injected dependencies.     |
| [`restrict-injectable-provided-in`](./src/rules/restrict-injectable-provided-in/)                             | ✅      |         | Restrict `@Injectable` `providedIn` values to `root` or `platform`.                           |
| [`tanstack-query-injects-only-in-component-body`](./src/rules/tanstack-query-injects-only-in-component-body/) | ✅      |         | Require TanStack Query inject helpers to be direct component/directive class fields.          |
| [`tanstack-query-inlined-keys`](./src/rules/tanstack-query-inlined-keys/)                                     | ✅      |         | Require TanStack Query query option keys to be inline arrays.                                 |
| [`tanstack-query-prefer-query-options`](./src/rules/tanstack-query-prefer-query-options/)                     | ✅      |         | Prefer `queryOptions()` to co-locate TanStack Query query keys and functions.                 |
| [`vitest-no-incompatible-angular-testing-apis`](./src/rules/vitest-no-incompatible-angular-testing-apis/)     | ✅      |         | Disallow Angular testing APIs that are incompatible with Vitest.                              |

## Oxlint setup

```jsonc
{
  "jsPlugins": ["@benjavicente/lint-angular"],
  "rules": {
    "@benjavicente/lint-angular/rules-of-inject": "error",
  },
}
```
