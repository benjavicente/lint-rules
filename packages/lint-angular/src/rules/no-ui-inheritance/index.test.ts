import { run } from "oxlint-vitest-rule-tester";
import noUiInheritance from "./index.js";

await run({
  name: "no-ui-inheritance",
  rule: noUiInheritance,
  valid: [
    'import { Component } from "@angular/core"; @Component({}) class C {}',
    'import { Directive } from "@angular/core"; @Directive({}) class D {}',
    "class Plain extends Base {}",
    'import { Injectable } from "@angular/core"; @Injectable() class S extends Base {}',
    'import * as ng from "@angular/core"; @ng.Pipe({ name: "x" }) class P extends Base {}',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; @Component({}) class C extends Base {}',
      errors: ["noUiInheritance"],
    },
    {
      code: 'import { Directive } from "@angular/core"; @Directive({}) class D extends Base {}',
      errors: ["noUiInheritance"],
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({}) class C extends Base {}',
      errors: ["noUiInheritance"],
    },
  ],
});
