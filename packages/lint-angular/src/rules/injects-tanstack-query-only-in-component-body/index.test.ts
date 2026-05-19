import { run } from "oxlint-vitest-rule-tester";
import injectsTanstackQueryOnlyInComponentBody from "./index.js";

await run({
  name: "injects-tanstack-query-only-in-component-body",
  rule: injectsTanstackQueryOnlyInComponentBody,
  valid: [
    'import { Component } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Component({}) class C { query = injectQuery(() => ({ queryKey: ["x"], queryFn })); }',
    'import { Directive } from "@angular/core"; import { injectMutation } from "@tanstack/angular-query"; @Directive({}) class D { mutation = injectMutation(() => ({ mutationFn })); }',
    'import { Component } from "@angular/core"; import { injectQuery as useQuery } from "@benjavicente/angular-query"; @Component({}) class C { query = useQuery(() => ({ queryKey: ["x"], queryFn })); }',
    'import { Component } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Component({}) class C { query = injectQuery(() => ({ queryKey: ["x"], queryFn })) satisfies unknown; }',
    "function injectQuery() {} injectQuery();",
    'import { injectQuery } from "./query"; injectQuery();',
  ],
  invalid: [
    {
      code: 'import { injectQuery } from "@tanstack/angular-query"; function load() { return injectQuery(() => ({ queryKey: ["x"], queryFn })); }',
      errors: ["onlyInComponentBody"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Component({}) class C { constructor() { injectQuery(() => ({ queryKey: ["x"], queryFn })); } }',
      errors: ["onlyInComponentBody"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Component({}) class C { method() { return injectQuery(() => ({ queryKey: ["x"], queryFn })); } }',
      errors: ["onlyInComponentBody"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Injectable() class S { query = injectQuery(() => ({ queryKey: ["x"], queryFn })); }',
      errors: ["onlyInComponentBody"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { injectQuery } from "@tanstack/angular-query"; @Component({}) class C { query = () => injectQuery(() => ({ queryKey: ["x"], queryFn })); }',
      errors: ["onlyInComponentBody"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { injectMutation } from "@benjavicente/angular-query"; @Component({}) class C { mutation = condition ? injectMutation(() => ({ mutationFn })) : null; }',
      errors: ["onlyInComponentBody"],
    },
  ],
});
