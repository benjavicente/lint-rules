# Component Class Matches Filename

Require component class names to match `*.component.ts` filenames.

## What

This rule checks files ending in `.component.ts` and enforces that Angular `@Component` class names match the filename in PascalCase with a `Component` suffix.

Example: `login-page.component.ts` should declare `LoginPageComponent`.

## Why

Consistent file and class naming makes Angular code easier to navigate, search, and refactor. It also prevents drift between generated conventions and manually renamed classes.

## Options

```json
{}
```
