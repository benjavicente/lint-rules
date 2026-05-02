import { run } from "oxlint-vitest-rule-tester";
import componentResourceFilenames from "./index.js";

await run({
  name: "component-resource-filenames",
  rule: componentResourceFilenames,
  defaultFilename: "/app/user-card.component.ts",
  valid: [
    'import { Component } from "@angular/core"; @Component({ templateUrl: "./user-card.component.html", styleUrl: "./user-card.component.css" }) class UserCardComponent {}',
    'import { Component } from "@angular/core"; @Component({ templateUrl: "user-card.component.html", styleUrl: "user-card.component.scss" }) class UserCardComponent {}',
    'import { Component } from "@angular/core"; @Component({ styleUrls: ["./other.component.css"] }) class UserCardComponent {}',
    'import * as ng from "@angular/core"; @ng.Component({ templateUrl: "./user-card.component.html", styleUrl: "./user-card.component.scss" }) class UserCardComponent {}',
    'import { Component as Cmp } from "@angular/core"; @Cmp({ templateUrl: "./user-card.component.html", styleUrl: "./user-card.component.css" }) class UserCardComponent {}',
    'import { Component } from "@angular/core"; @Component({ template: "<p></p>", styles: [":host { display: block; }"] }) class UserCardComponent {}',
    'import { Component } from "@angular/core"; @Component({ templateUrl, styleUrl }) class UserCardComponent {}',
    'import { Component } from "not-angular"; @Component({ templateUrl: "./other.html", styleUrl: "./other.css" }) class UserCardComponent {}',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; @Component({ templateUrl: "./other.component.html" }) class UserCardComponent {}',
      errors: ["templateUrlMismatch"],
      output: null,
    },
    {
      code: 'import { Component } from "@angular/core"; @Component({ styleUrl: "./other.component.scss" }) class UserCardComponent {}',
      errors: ["styleUrlMismatch"],
      output: null,
    },
    {
      code: "import { Component } from '@angular/core'; @Component({ templateUrl: './other.component.html', styleUrl: './other.component.less' }) class UserCardComponent {}",
      errors: ["templateUrlMismatch", "styleUrlMismatch"],
      output: null,
    },
    {
      code: "import { Component } from '@angular/core'; @Component({ templateUrl: `./other.component.html`, styleUrl: `./other.component.sass` }) class UserCardComponent {}",
      errors: ["templateUrlMismatch", "styleUrlMismatch"],
      output: null,
    },
    {
      code: 'import { Component } from "@angular/core"; @Component({ styleUrl: "./user-card.component.postcss" }) class UserCardComponent {}',
      errors: ["unsupportedStyleExtension"],
      output: null,
    },
  ],
});
