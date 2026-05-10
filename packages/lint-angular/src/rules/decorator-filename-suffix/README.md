# Decorator Filename Suffix

Require Angular component, directive, and service decorators to be declared in files with matching filename suffixes.

## What

This rule checks Angular class decorators imported from `@angular/core` and enforces:

- `@Component` classes are declared in `*.component.ts` files.
- `@Directive` classes are declared in `*.directive.ts` files.
- `@Service` and `@Injectable` classes are declared in `*.service.ts` files.

## Why

Matching Angular decorators to filename suffixes keeps file search, generated code, and symbol navigation consistent across a project.

## Options

```json
{}
```
