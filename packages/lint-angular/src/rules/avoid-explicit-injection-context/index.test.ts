import { run } from "oxlint-vitest-rule-tester";
import avoidExplicitInjectionContext from "./index.js";

await run({
  name: "avoid-explicit-injection-context",
  rule: avoidExplicitInjectionContext,
  valid: [
    'import { inject } from "@angular/core"; class C { service = inject(Service); }',
    'import { Injector, inject } from "@angular/core"; class C { service = inject(Service); injector = Injector.create({ providers: [] }); }',
    {
      code: 'import { Injector, inject } from "@angular/core"; const injector = inject(Injector);',
      options: [{ disallowInjectInjector: false }],
    },
    {
      code: 'import { runInInjectionContext } from "@angular/core"; runInInjectionContext(injector, () => makeThing());',
      options: [{ disallowRunInInjectionContext: false }],
    },
    {
      code: 'import { Injector, inject, runInInjectionContext } from "@angular/core"; const injector = inject(Injector); runInInjectionContext(injector, () => work());',
      options: [{ disallowInjectInjector: false, disallowRunInInjectionContext: false }],
    },
  ],
  invalid: [
    {
      code: 'import { Injector, inject } from "@angular/core"; const injector = inject(Injector);',
      errors: ["avoidInjectInjector"],
    },
    {
      code: 'import * as ng from "@angular/core"; const injector = ng.inject(ng.Injector);',
      errors: ["avoidInjectInjector"],
    },
    {
      code: 'import { runInInjectionContext } from "@angular/core"; runInInjectionContext(injector, () => makeThing());',
      errors: ["avoidRunInInjectionContext"],
    },
    {
      code: 'import { runInContext } from "@angular/core"; runInContext(injector, () => makeThing());',
      errors: ["avoidRunInInjectionContext"],
    },
    {
      code: 'import * as ng from "@angular/core"; ng.runInInjectionContext(injector, () => makeThing());',
      errors: ["avoidRunInInjectionContext"],
    },
    {
      code: 'import { Injector, inject, runInInjectionContext } from "@angular/core"; const injector = inject(Injector); runInInjectionContext(injector, () => work());',
      errors: ["avoidInjectInjector", "avoidRunInInjectionContext"],
    },
    {
      code: 'import { Injector as NgInjector, inject as useInject } from "@angular/core"; const injector = useInject(NgInjector);',
      errors: ["avoidInjectInjector"],
    },
  ],
});
