import { run } from "oxlint-vitest-rule-tester";
import avoidInappropriateIntimacy from "./index.js";

await run({
  name: "avoid-inappropriate-intimacy",
  rule: avoidInappropriateIntimacy,
  valid: [
    'import { Component } from "@angular/core"; @Component({}) class C { save() { helper(this.id); } }',
    'import { Directive } from "@angular/core"; @Directive({}) class D { save() { helper(() => this.value); } }',
    "class Plain { save() { helper(this); } }",
    'import { Pipe } from "@angular/core"; @Pipe({ name: "x" }) class P { save() { helper(this); } }',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; @Component({}) class C { save() { helper(this); } }',
      errors: ["avoidThisArgument"],
    },
    {
      code: 'import { Directive } from "@angular/core"; @Directive({}) class D { save() { helper(1, this); } }',
      errors: ["avoidThisArgument"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; @Injectable() class S { save() { helper(this); } }',
      errors: ["avoidThisArgument"],
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({}) class C { save() { helper(this, this); } }',
      errors: ["avoidThisArgument", "avoidThisArgument"],
    },
  ],
});
