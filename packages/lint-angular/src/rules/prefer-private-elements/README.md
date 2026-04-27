# Prefer ECMAScript Private Elements

Prefer `#privateField` syntax over TypeScript `private` members.

## What

Enforces ECMAScript private elements instead of TypeScript `private` modifier.

For supported cases, it auto-fixes:

- `private value` to `#value`
- internal same-class references like `this.value` to `this.#value`
- compatible static references like `ClassName.value` to `ClassName.#value`

The fixer skips patterns where a safe rewrite cannot be guaranteed.

## Why

- Enforces private values at runtime
- Allows bundlers to minify names of private elements

## Options

```json
{}
```
