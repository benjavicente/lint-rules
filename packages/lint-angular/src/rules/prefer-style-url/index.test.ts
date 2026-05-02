import { run } from "oxlint-vitest-rule-tester";
import preferStyleUrl from "./index.js";

await run({
  name: "prefer-style-url",
  rule: preferStyleUrl,
  valid: [
    'import { Component } from "@angular/core"; @Component({ styleUrl: "./cmp.css" }) class C {}',
    'import { Component } from "@angular/core"; @Component({ styleUrls: ["./a.css", "./b.css"] }) class C {}',
    'import { Component } from "@angular/core"; @Component({ styleUrls: styles }) class C {}',
    'import { Directive } from "@angular/core"; @Directive({ styleUrls: ["./cmp.css"] }) class C {}',
    'import { Component } from "not-angular"; @Component({ styleUrls: ["./cmp.css"] }) class C {}',
    'const metadata = { styleUrls: ["./cmp.css"] };',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; @Component({ styleUrls: ["./cmp.css"] }) class C {}',
      errors: ["preferStyleUrl"],
      output:
        'import { Component } from "@angular/core"; @Component({ styleUrl: "./cmp.css" }) class C {}',
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({ selector: "x", styleUrls: [`./cmp.css`] }) class C {}',
      errors: ["preferStyleUrl"],
      output:
        'import * as ng from "@angular/core"; @ng.Component({ selector: "x", styleUrl: `./cmp.css` }) class C {}',
    },
    {
      code: 'import { Component } from "@angular/core"; @Component({ "styleUrls": ["./cmp.css"] }) class C {}',
      errors: ["preferStyleUrl"],
      output:
        'import { Component } from "@angular/core"; @Component({ styleUrl: "./cmp.css" }) class C {}',
    },
  ],
});
