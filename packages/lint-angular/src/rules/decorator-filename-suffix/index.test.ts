import { run } from "oxlint-vitest-rule-tester";
import decoratorFilenameSuffix from "./index.js";

await run({
  name: "decorator-filename-suffix",
  rule: decoratorFilenameSuffix,
  valid: [
    {
      filename: "/app/user-card.component.ts",
      code: 'import { Component } from "@angular/core"; @Component({}) export class UserCardComponent {}',
    },
    {
      filename: "/app/focus-trap.directive.ts",
      code: 'import { Directive } from "@angular/core"; @Directive({}) export class FocusTrapDirective {}',
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Injectable } from "@angular/core"; @Injectable() export class AuthService {}',
    },
    {
      filename: "/app/auth.service.ts",
      code: 'import { Service } from "@angular/core"; @Service() export class AuthService {}',
    },
    {
      filename: "/app/user-card.component.ts",
      code: 'import * as ng from "@angular/core"; @ng.Component({}) export class UserCardComponent {}',
    },
    {
      filename: "/app/user-card.component.ts",
      code: 'import { Component as Cmp } from "@angular/core"; @Cmp({}) export class UserCardComponent {}',
    },
    {
      filename: "/app/user-card.ts",
      code: 'import { Component } from "not-angular"; @Component({}) export class UserCardComponent {}',
    },
    {
      filename: "/app/model.ts",
      code: "export class Model {}",
    },
  ],
  invalid: [
    {
      filename: "/app/user-card.ts",
      code: 'import { Component } from "@angular/core"; @Component({}) export class UserCardComponent {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
    {
      filename: "/app/focus-trap.ts",
      code: 'import { Directive } from "@angular/core"; @Directive({}) export class FocusTrapDirective {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
    {
      filename: "/app/auth.ts",
      code: 'import { Injectable } from "@angular/core"; @Injectable() export class AuthService {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
    {
      filename: "/app/auth.ts",
      code: 'import { Service } from "@angular/core"; @Service() export class AuthService {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
    {
      filename: "/app/auth.component.ts",
      code: 'import { Injectable } from "@angular/core"; @Injectable() export class AuthService {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
    {
      filename: "/app/auth.ts",
      code: 'import * as ng from "@angular/core"; @ng.Service() export class AuthService {}',
      errors: [{ messageId: "filenameSuffix", type: "Decorator" }],
    },
  ],
});
