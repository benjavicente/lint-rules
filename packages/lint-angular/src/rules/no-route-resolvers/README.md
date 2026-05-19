# No Route Resolvers

Disallow `resolve` properties in typed Angular `Route` and `Routes` declarations.

## Why

Route resolvers hide data loading at the routing layer and make loading
granularity harder to reason about. Prefer component-level loading with signals
or a dedicated server-state helper.
