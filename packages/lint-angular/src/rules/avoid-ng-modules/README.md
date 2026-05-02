# Avoid NgModules

Avoid `@NgModule` patterns in favor of modern standalone Angular APIs.

## What

This rule focuses on three concrete NgModule patterns:

- `imports`/`exports` grouping (recommend standalone components/directives/pipes directly)
- `*.forRoot(...)` provider registration (recommend `provideX(...)` functions)
- `RouterModule.forChild(routes)` route setup (recommend `provideRouter(...)` and lazy route entries such as `loadComponent: () => import('./components/auth/login-page')`)

It also emits more specific guidance for common migration cases:

- `RouterModule.forRoot(routes)` -> `provideRouter(routes)` ([docs](https://angular.dev/guide/routing/define-routes))
- `StoreModule.forRoot(...)` -> `provideStore(...)`
- `StoreModule.forFeature(...)` -> `provideState(...)`
- `EffectsModule.forRoot(...)` / `EffectsModule.forFeature(...)` -> `provideEffects(...)`
- `StoreDevtoolsModule.instrument(...)` -> `provideStoreDevtools(...)`
- `StoreRouterConnectingModule.forRoot(...)` -> `provideRouterStore(...)`

Options (booleans):

- `allowForGrouping` (default: `true`)
- `allowForProviding` (default: `false`)
- `allowForRouting` (default: `false`)

## Why

Standalone Angular APIs reduce indirection and make dependency, routing, and composition boundaries clearer. Moving away from module composition (`imports`/`exports`, `forRoot`, and `RouterModule.forChild`) helps modernize codebases and aligns with Angular’s recommended architecture.

## Options

```json
{
  "allowForGrouping": true,
  "allowForProviding": false,
  "allowForRouting": false
}
```
