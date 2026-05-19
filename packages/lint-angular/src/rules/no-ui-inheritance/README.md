# No UI Inheritance

Disallow `extends` on Angular components and directives.

## Why

UI inheritance couples component internals and templates across class boundaries.
Prefer services, composition, and `inject*` helpers for shared behavior.
