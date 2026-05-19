import { run } from "oxlint-vitest-rule-tester";
import noRouteResolvers from "./index.js";

await run({
  name: "no-route-resolvers",
  rule: noRouteResolvers,
  valid: [
    'import type { Routes } from "@angular/router"; const routes: Routes = [{ path: "", loadComponent: () => import("./home") }];',
    'import type { Route } from "@angular/router"; const route: Route = { path: "", component: HomeComponent };',
    'const routes = [{ path: "", resolve: { user: () => user } }];',
    'import type { Routes } from "./router"; const routes: Routes = [{ resolve: {} }];',
  ],
  invalid: [
    {
      code: 'import type { Routes } from "@angular/router"; const routes: Routes = [{ path: "", resolve: { user: () => user } }];',
      errors: ["noRouteResolvers"],
    },
    {
      code: 'import type { Routes } from "@angular/router"; const routes: Routes = [{ path: "", children: [{ path: "child", resolve: { user: () => user } }] }];',
      errors: ["noRouteResolvers"],
    },
    {
      code: 'import type { Route } from "@angular/router"; const route: Route = { path: "", resolve: { user: () => user } };',
      errors: ["noRouteResolvers"],
    },
    {
      code: 'import type * as router from "@angular/router"; const routes: router.Routes = [{ resolve: {} }];',
      errors: ["noRouteResolvers"],
    },
  ],
});
