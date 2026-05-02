# `@benjavicente/lint-angular`

Oxlint/ESLint-compatible plugin for Angular project rules.

## Rules


| Rule                                                                                                  | Default | Fixable |
| ----------------------------------------------------------------------------------------------------- | ------- | ------- |
| [`rules-of-inject`](./src/rules/rules-of-inject/)                                                     | ✅       |         |
| [`avoid-explicit-injection-context`](./src/rules/avoid-explicit-injection-context/)                   | ✅       |         |
| [`avoid-explicit-subscription-management`](./src/rules/avoid-explicit-subscription-management/)       | ✅       |         |
| [`avoid-ng-modules`](./src/rules/avoid-ng-modules/)                                                   | ✅       |         |
| [`avoid-rxjs-state-in-component`](./src/rules/avoid-rxjs-state-in-component/)                         | ✅       |         |
| [`avoid-writing-signals-in-reactive-context`](./src/rules/avoid-writing-signals-in-reactive-context/) | ✅       |         |
| [`class-member-order`](./src/rules/class-member-order/)                                               | ✅       |         |
| [`component-class-matches-filename`](./src/rules/component-class-matches-filename/)                   | ✅       |         |
| [`component-resource-filenames`](./src/rules/component-resource-filenames/)                           | ✅       |         |
| [`prefer-private-elements`](./src/rules/prefer-private-elements/)                                     | ✅       | ✅       |
| [`prefer-load-component-over-load-children`](./src/rules/prefer-load-component-over-load-children/)   | ✅       |         |
| [`prefer-style-url`](./src/rules/prefer-style-url/)                                                   | ✅       | ✅       |
| [`public-component-interface`](./src/rules/public-component-interface/)                               | ✅       | ✅       |
| [`restrict-injectable-provided-in`](./src/rules/restrict-injectable-provided-in/)                     | ✅       |         |


## Oxlint setup

```jsonc
{
  "jsPlugins": ["@benjavicente/lint-angular"],
  "rules": {
    "@benjavicente/lint-angular/rules-of-inject": "error",
  },
}
```
