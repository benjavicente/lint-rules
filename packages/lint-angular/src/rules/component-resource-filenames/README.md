# Component Resource Filenames

Require Angular component `templateUrl` and `styleUrl` filenames to match the
component TypeScript filename.

## What

This rule checks Angular `@Component(...)` metadata and reports static
`templateUrl` and `styleUrl` values whose filenames do not match the component
TypeScript filename.

For `user-card.component.ts`, resource files should be named:

- `user-card.component.html`
- `user-card.component.css`
- `user-card.component.scss`
- `user-card.component.sass`
- `user-card.component.less`

Static string literals and expressionless template literals are checked. Dynamic
values are ignored.

`styleUrls` is intentionally ignored.

## Why

Matching component, template, and stylesheet filenames keeps colocated Angular
resources easy to navigate and prevents drift after component renames.

## Options

```json
{}
```
