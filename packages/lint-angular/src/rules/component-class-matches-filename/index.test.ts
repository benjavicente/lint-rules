import { run } from "oxlint-vitest-rule-tester";
import componentClassMatchesFilename from "./index.js";

await run({
  name: "component-class-matches-filename",
  rule: componentClassMatchesFilename,
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
      filename: "/app/login-page.service.ts",
      code: "export class LoginPageService {}",
    },
    {
      filename: "/app/login-page.component.ts",
      code: "class LoginPageComponent {}",
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
  ],
});
