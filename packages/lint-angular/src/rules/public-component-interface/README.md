# Public Component Interface

Require signal-based component/directive interface members to be public, and injected fields to be non-public.

## What

This rule reports non-public class members (`private`, `protected`, or `#private`) when they are initialized with Angular signal interface APIs:

- `input(...)` and `input.required(...)`
- `model(...)` and `model.required(...)`
- `output(...)`
- `outputFromObservable(...)`

It supports direct imports, aliased imports, and namespace usage from `@angular/core` (for example `ng.input(...)`).

This rule also reports public members initialized with `inject(...)`/`ng.inject(...)`. Those should be `protected` (if template access is needed) or private (`private`/`#private`).

Decorator-based APIs (`@Input`, `@Output`) are intentionally excluded.

## Fixes

This rule can auto-fix:

- `private`/`protected` signal interface members by rewriting the modifier to `public`.
- public `inject(...)` members by rewriting/inserting `protected`.

`#private` fields are reported but are not auto-fixed.

## Why

Inputs/models/outputs define the external component/directive contract. Marking them non-public can hide or misrepresent that interface.
