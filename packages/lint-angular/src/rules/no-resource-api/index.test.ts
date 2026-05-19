import { run } from "oxlint-vitest-rule-tester";
import noResourceApi from "./index.js";

await run({
  name: "no-resource-api",
  rule: noResourceApi,
  valid: [
    'import { signal } from "@angular/core"; const value = signal(1);',
    "function resource() { return 1; } resource();",
    'import { httpResource } from "./http"; httpResource(() => "/api");',
    'import * as core from "@angular/core"; function load(core: { resource(): void }) { core.resource(); }',
  ],
  invalid: [
    {
      code: 'import { resource } from "@angular/core"; const user = resource({ loader: loadUser });',
      errors: ["noResourceApi"],
    },
    {
      code: 'import * as core from "@angular/core"; const user = core.resource({ loader: loadUser });',
      errors: ["noResourceApi"],
    },
    {
      code: 'import { rxResource } from "@angular/core/rxjs-interop"; const user = rxResource({ stream: user$ });',
      errors: ["noResourceApi"],
    },
    {
      code: 'import { httpResource } from "@angular/common/http"; const user = httpResource(() => "/api/user");',
      errors: ["noResourceApi"],
    },
    {
      code: 'import { httpResource } from "@angular/common/http"; const user = httpResource.text(() => "/api/user");',
      errors: ["noResourceApi"],
    },
    {
      code: 'import * as http from "@angular/common/http"; const user = http.httpResource.text(() => "/api/user");',
      errors: ["noResourceApi"],
    },
  ],
});
