# Class Member Order

Keep Angular class members in a predictable top-to-bottom order.

## What

This rule enforces the following member order in Angular-decorated classes:

- plain `inject()` field initializers first
- `input()`/`model()` fields (and `@Input`) next
- outputs (`output()`, `outputFromObservable()`, and `@Output`) after that
- everything else last (other fields and methods)

## Why

Consistency of members layout, moving dependencies, inputs and outputs in a predictable order.

## Options

```json
{}
```
