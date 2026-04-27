import { run } from "oxlint-vitest-rule-tester";
import restrictInjectableProvidedIn from "./index.js";

await run({
  name: "restrict-injectable-provided-in",
  rule: restrictInjectableProvidedIn,
  valid: [
    'import { Injectable } from "@angular/core"; @Injectable({ providedIn: "root" }) export class AuthService {}',
    'import { Injectable } from "@angular/core"; @Injectable({ providedIn: "platform" }) export class PlatformService {}',
    'import { Injectable } from "@angular/core"; @Injectable() export class LocalService {}',
    'import * as ng from "@angular/core"; @ng.Injectable({ providedIn: "root" }) export class RootService {}',
  ],
  invalid: [
    {
      code: 'import { Injectable } from "@angular/core"; @Injectable({ providedIn: "any" }) export class AnyService {}',
      errors: ["disallowedProvidedIn"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; @Injectable({ providedIn: null }) export class NullScopedService {}',
      errors: ["disallowedProvidedIn"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; @Injectable({ providedIn: featureInjector }) export class FeatureService {}',
      errors: ["disallowedProvidedIn"],
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Injectable({ providedIn: "any" }) export class NamespaceService {}',
      errors: ["disallowedProvidedIn"],
    },
  ],
});
