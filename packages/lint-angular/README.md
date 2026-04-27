# `@benjavicente/lint-angular`

Oxlint/ESLint-compatible plugin for Angular project rules.

## Rules

| Rule                                                                                                  | Default | Fixable |
| ----------------------------------------------------------------------------------------------------- | ------- | ------- |
| [`rules-of-inject`](./src/rules/rules-of-inject/)                                                     | ✅      |         |
| [`avoid-explicit-injection-context`](./src/rules/avoid-explicit-injection-context/)                   | ✅      |         |
| [`avoid-ng-modules`](./src/rules/avoid-ng-modules/)                                                   | ✅      |         |
| [`avoid-writing-signals-in-reactive-context`](./src/rules/avoid-writing-signals-in-reactive-context/) | ✅      |         |
| [`class-member-order`](./src/rules/class-member-order/)                                               | ✅      |         |
| [`component-class-matches-filename`](./src/rules/component-class-matches-filename/)                   | ✅      |         |
| [`prefer-private-elements`](./src/rules/prefer-private-elements/)                                     | ✅      | ✅      |
| [`prefer-load-component-over-load-children`](./src/rules/prefer-load-component-over-load-children/)   | ✅      |         |
| [`prefer-style-url`](./src/rules/prefer-style-url/)                                                   | ✅      | ✅      |
| [`restrict-injectable-provided-in`](./src/rules/restrict-injectable-provided-in/)                     | ✅      |         |

## Oxlint setup

```jsonc
{
  "jsPlugins": ["@benjavicente/lint-angular"],
  "rules": {
    "@benjavicente/lint-angular/rules-of-inject": "error",
  },
}
```
