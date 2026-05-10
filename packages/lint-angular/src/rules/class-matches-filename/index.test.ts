import { run } from "oxlint-vitest-rule-tester";
import classMatchesFilename from "./index.js";

await run({
  name: "class-matches-filename",
  rule: classMatchesFilename,
  valid: [
    {
      filename: "/app/login-page.component.ts",
      code: 'import { Component } from "@angular/core"; @Component({ standalone: true }) export class LoginPageComponent {}',
    },
    {
      filename: "/app/user_profile.component.ts",
      code: 'import { Component } from "@angular/core"; @Component({ standalone: true }) class UserProfileComponent {}',
    },
    {
      filename: "/app/focus-trap.directive.ts",
      code: 'import { Directive } from "@angular/core"; @Directive({ selector: "[focusTrap]" }) export class FocusTrapDirective {}',
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Injectable } from "@angular/core"; @Injectable({ providedIn: "root" }) export class AuthService {}',
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Service } from "@angular/core"; @Service({ providedIn: "root" }) export class AuthService {}',
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import * as ng from "@angular/core"; @ng.Service({ providedIn: "root" }) export class AuthService {}',
    },
    {
      filename: "/app/login-page.component.ts",
      options: [{ ignoreClassSuffix: true }],
      code: 'import { Component } from "@angular/core"; @Component({}) export class LoginPage {}',
    },
    {
      filename: "/app/auth.service.ts",
      options: [{ ignoreClassSuffix: { service: true } }],
      code: 'import { Injectable } from "@angular/core"; @Injectable() export class Auth {}',
    },
    {
      filename: "/app/user-card.component.ts",
      code: 'import { Component } from "@angular/core"; export class UserCardHarness {} @Component({}) export class UserCardComponent {}',
    },
    {
      filename: "/app/user-card.model.ts",
      code: "export class UserCardModel {}",
    },
  ],
  invalid: [
    {
      filename: "/app/login-page.component.ts",
      code: 'import { Component } from "@angular/core"; @Component({}) export class LoginComponent {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/admin.component.ts",
      code: 'import * as ng from "@angular/core"; @ng.Component({}) export class AdminPageComponent {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/focus-trap.directive.ts",
      code: 'import { Directive } from "@angular/core"; @Directive({}) export class TrapDirective {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Injectable } from "@angular/core"; @Injectable() export class AuthInjectable {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Service } from "@angular/core"; @Service() export class Auth {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/login-page.component.ts",
      code: "export class LoginPageComponent {}",
      errors: [{ messageId: "decoratedClassCount" }],
    },
    {
      filename: "/app/user-card.component.ts",
      code: 'import { Component } from "@angular/core"; @Component({}) export class UserCardComponent {} @Component({}) export class UserCardListComponent {}',
      errors: [{ messageId: "decoratedClassCount" }],
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Component } from "@angular/core"; @Component({}) export class AuthService {}',
      errors: [{ messageId: "decoratedClassCount" }],
    },
    {
      filename: "/app/login-page.component.ts",
      options: [{ ignoreClassSuffix: { service: true } }],
      code: 'import { Component } from "@angular/core"; @Component({}) export class LoginPage {}',
      errors: [{ messageId: "classNameMismatch", type: "Identifier" }],
    },
    {
      filename: "/app/user-card.component.ts",
      code: 'import { Component } from "not-angular"; @Component({}) export class UserCardComponent {}',
      errors: [{ messageId: "decoratedClassCount" }],
    },
  ],
});
