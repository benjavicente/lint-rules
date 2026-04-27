# Rules of `inject()`

Only call Angular `inject()` from valid injection contexts.

## What

Does it's best attempt to enforce a predictable way to declare that a function should run in an injection context, by using conventions and statiuc analysis of where a functions is called.

It tries to check that those funcions are called only in:

- Angular-decorated class field initializers and constructors
- provider/token factory functions
- callbacks passed to `runInInjectionContext`/`runInContext`
- supported route callback properties (such as `loadComponent` and guards)

By default, the convention is that utility functions that use the injection context should be prefixed with `injextXXX` or should be suffixed by `xxxGuard`. You can customize both naming conventions with `injectFunctionPrefixes` and `injectFunctionSuffixes`. If you use imported helpers from specific modules (for example `@signality/core`) that should be treated as running in injection context, configure them with `runsInInjectionContext`.

## Why

Calling `inject()` outside an injection context causes runtime failures and is often hard to spot without a consistent naming scheme. Enforcing context-safe usage catches these errors early and makes dependency access patterns more reliable and explicit.

## Options

```json
{
  "allowedFunctionNames": [],
  "checkUnimportedInject": false,
  "injectFunctionPrefixes": ["injext"],
  "injectFunctionSuffixes": ["Guard"],
  "runsInInjectionContext": []
}
```
