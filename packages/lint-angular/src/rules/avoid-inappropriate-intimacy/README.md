# Avoid Inappropriate Intimacy

Disallow passing `this` as an argument from Angular components, directives, and
services.

## Why

Passing a whole Angular class instance gives callees broad access to internals
and couples them to implementation details. Pass only the values or callbacks
the callee needs.
