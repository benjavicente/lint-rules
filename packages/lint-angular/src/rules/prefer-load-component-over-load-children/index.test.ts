import { run } from "oxlint-vitest-rule-tester";
import preferLoadComponentOverLoadChildren from "./index.js";

await run({
  name: "prefer-load-component-over-load-children",
  rule: preferLoadComponentOverLoadChildren,
  valid: [
    'import type { Routes } from "@angular/router"; export const routes: Routes = [{ path: "login", loadComponent: () => import("./login.component").then((m) => m.LoginComponent) }];',
    'const routes: Routes = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
    'import type { Routes } from "@angular/router"; export const routes = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
    'import type { Routes } from "@angular/router"; export const routes: Routes = [{ path: "login", data: { loadChildren: "analytics-label" } }];',
    'import type { Routes } from "@angular/router"; export const routes: Routes = [{ path: "login", providers: [{ provide: TOKEN, useValue: { loadChildren: true } }] }];',
    'import type { Routes as RouterRoutes } from "not-angular"; export const routes: RouterRoutes = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
  ],
  invalid: [
    {
      code: 'import type { Routes } from "@angular/router"; export const routes: Routes = [{ path: "auth", loadChildren: () => import("./auth.routes").then((m) => m.AUTH_ROUTES) }];',
      errors: [{ messageId: "avoidLoadChildren", type: "Identifier" }],
    },
    {
      code: 'import type { Routes } from "@angular/router"; export const routes: Routes = [{ path: "parent", children: [{ path: "child", loadChildren: () => import("./child.routes").then((m) => m.routes) }] }];',
      errors: [{ messageId: "avoidLoadChildren", type: "Identifier" }],
    },
    {
      code: 'import type { Route } from "@angular/router"; export const routes: Route[] = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
      errors: [{ messageId: "avoidLoadChildren", type: "Identifier" }],
    },
    {
      code: 'import type { Route } from "@angular/router"; export const routes: Array<Route> = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
      errors: [{ messageId: "avoidLoadChildren", type: "Identifier" }],
    },
    {
      code: 'import type { Routes as RouterRoutes } from "@angular/router"; export const routes: RouterRoutes = [{ path: "login", loadChildren: () => import("./feature.routes").then((m) => m.routes) }];',
      errors: [{ messageId: "avoidLoadChildren", type: "Identifier" }],
    },
  ],
});
