# Rules of Injection Context APIs

Only call Angular APIs that depend on injection context where the injection context
is available.

## What

Does it's best attempt to statically analyze those cases by combining naming
conventions, a known set of APIs that require injection context, and a known set
of places that run in injection context.

Known Angular APIs include `inject`, `assertInInjectionContext`, signal effects and
render callbacks, `resource`, RxJS interop APIs such as `toSignal`,
`toObservable`, and `rxResource`, `httpResource`, and signal forms `form`.

It tries to check that those funcions are called only in:

- Angular-decorated class field initializers and constructors
- provider/token factory functions
- callbacks passed to `runInInjectionContext`/`runInContext`
- supported route callback properties (such as `loadComponent` and guards)

By default, the convention is that utility functions that use the injection context should be prefixed with `injextXXX` or should be suffixed by `xxxGuard`. You can customize both naming conventions with `injectFunctionPrefixes` and `injectFunctionSuffixes`. If you use imported helpers from specific modules (for example `@signality/core`) that should be treated as running in injection context, configure them with `runsInInjectionContext`.

## Why

Calling APIs that depend on injection context outside an injection context causes runtime failures and is often hard to spot without a consistent naming scheme. Enforcing context-safe usage catches these errors early and makes dependency access patterns more reliable and explicit.

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
