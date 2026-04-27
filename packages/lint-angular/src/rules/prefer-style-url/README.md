# Prefer `styleUrl` for Single Style File

Use `styleUrl` when a component has exactly one stylesheet.

## What

Checks Angular `@Component(...)` metadata and reports `styleUrls` when it contains exactly one style file. It auto-fixes:

- `styleUrls: ["./cmp.css"]` to `styleUrl: "./cmp.css"`
- template-literal single entries as well

## Why

`styleUrl` communicates intent more clearly for single-file styling and keeps metadata concise.

## Options

```json
{}
```
