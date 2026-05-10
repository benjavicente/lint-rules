# Class Matches Filename

Require Angular component, directive, and service class names to match their filenames.

## What

This rule checks files matching the first applicable filename pattern:

- `*.component.ts` with Angular `@Component`
- `*.directive.ts` with Angular `@Directive`
- `*.service.ts` with Angular `@Service` or `@Injectable`

The file must contain exactly one matching decorated class. That class name must match the filename in PascalCase with the matching Angular suffix.

Examples:

- `login-page.component.ts` should declare `LoginPageComponent`.
- `focus-trap.directive.ts` should declare `FocusTrapDirective`.
- `auth.service.ts` should declare `AuthService`.

## Why

Consistent file and class naming makes Angular code easier to navigate, search, and refactor. It also prevents drift between generated conventions and manually renamed classes.

## Options

```json
{
  "ignoreClassSuffix": false
}
```

`ignoreClassSuffix` can be:

- `false` by default, requiring suffixes such as `ExampleComponent`.
- `true`, allowing `Example` as well as `ExampleComponent`, `ExampleDirective`, or `ExampleService`.
- An object with optional `component`, `directive`, and `service` booleans.

```json
{
  "ignoreClassSuffix": {
    "service": true
  }
}
```
