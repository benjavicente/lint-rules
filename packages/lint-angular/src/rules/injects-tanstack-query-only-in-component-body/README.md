# TanStack Query Injects Only In Component Body

Require `injectQuery` and `injectMutation` from Angular TanStack Query packages
to be called only as direct class field initializers in Angular components and
directives.

## Why

Query and mutation inject helpers represent component/directive data concerns.
Keeping them on the class body makes ownership and lifecycle coupling explicit.
