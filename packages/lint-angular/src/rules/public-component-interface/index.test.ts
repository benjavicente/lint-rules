import { run } from "oxlint-vitest-rule-tester";
import publicComponentInterface from "./index.js";

await run({
  name: "public-component-interface",
  rule: publicComponentInterface,
  defaultFilename: "public-component-interface.ts",
  valid: [
    'import { Component, input, model, output } from "@angular/core"; @Component({}) class C { value = input<string>(); count = model(0); changed = output<number>(); }',
    'import { Component, input } from "@angular/core"; @Component({}) class C { public value = input.required<string>(); }',
    'import * as ng from "@angular/core"; @ng.Component({}) class C { value = ng.input<string>(); changed = ng.output<number>(); }',
    'import { Directive, input as i, output as o } from "@angular/core"; @Directive({}) class D { value = i<string>(); changed = o<number>(); }',
    'import { Component, outputFromObservable } from "@angular/core"; @Component({}) class C { changed = outputFromObservable(stream$); }',
    'import { Component, output } from "@angular/core"; @Component({}) class C { private changed = output.required<number>(); }',
    'import { Component, inject } from "@angular/core"; @Component({}) class C { service = inject.required(Service); }',
    'import * as ng from "@angular/core"; @ng.Component({}) class C { private changed = ng.output.required<number>(); }',
    'import { Component, inject } from "@angular/core"; @Component({}) class C { protected service = inject(Service); }',
    'import { Component, inject } from "@angular/core"; @Component({}) class C { private service = inject(Service); }',
    'import * as ng from "@angular/core"; @ng.Component({}) class C { protected service = ng.inject(Service); }',
    'import { Component } from "@angular/core"; @Component({}) class C { service = inject(Service); }',
    'import { Pipe, input } from "@angular/core"; @Pipe({ name: "x" }) class P { private value = input<string>(); }',
    'import { Component } from "@angular/core"; @Component({}) class C { private value = somethingElse(); }',
    'import { Component } from "not-angular"; import { input, inject } from "@angular/core"; @Component({}) class C { private value = input<string>(); service = inject(Service); }',
  ],
  invalid: [
    {
      code: 'import { Component, input } from "@angular/core"; @Component({}) class C { private value = input<string>(); }',
      errors: [{ messageId: "nonPublicInputModel", type: "Identifier" }],
      output:
        'import { Component, input } from "@angular/core"; @Component({}) class C { public value = input<string>(); }',
    },
    {
      code: 'import { Component, model } from "@angular/core"; @Component({}) class C { protected count = model(0); }',
      errors: [{ messageId: "nonPublicInputModel", type: "Identifier" }],
      output:
        'import { Component, model } from "@angular/core"; @Component({}) class C { public count = model(0); }',
    },
    {
      code: 'import { Component, input } from "@angular/core"; @Component({}) class C { #value = input.required<string>(); }',
      errors: [{ messageId: "nonPublicInputModel", type: "PrivateIdentifier" }],
      output: null,
    },
    {
      code: 'import { Component, output } from "@angular/core"; @Component({}) class C { private changed = output<number>(); }',
      errors: [{ messageId: "nonPublicOutput", type: "Identifier" }],
      output:
        'import { Component, output } from "@angular/core"; @Component({}) class C { public changed = output<number>(); }',
    },
    {
      code: 'import { Component, outputFromObservable } from "@angular/core"; @Component({}) class C { protected changed = outputFromObservable(stream$); }',
      errors: [{ messageId: "nonPublicOutput", type: "Identifier" }],
      output:
        'import { Component, outputFromObservable } from "@angular/core"; @Component({}) class C { public changed = outputFromObservable(stream$); }',
    },
    {
      code: 'import { Component, input as i, output as o } from "@angular/core"; @Component({}) class C { private value = i<string>(); protected changed = o<number>(); }',
      errors: [
        { messageId: "nonPublicInputModel", type: "Identifier" },
        { messageId: "nonPublicOutput", type: "Identifier" },
      ],
      output:
        'import { Component, input as i, output as o } from "@angular/core"; @Component({}) class C { public value = i<string>(); public changed = o<number>(); }',
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({}) class C { protected value = ng.input<string>(); private changed = ng.output<number>(); }',
      errors: [
        { messageId: "nonPublicInputModel", type: "Identifier" },
        { messageId: "nonPublicOutput", type: "Identifier" },
      ],
      output:
        'import * as ng from "@angular/core"; @ng.Component({}) class C { public value = ng.input<string>(); public changed = ng.output<number>(); }',
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({}) class C { protected value = ng.model.required<number>(); }',
      errors: [{ messageId: "nonPublicInputModel", type: "Identifier" }],
      output:
        'import * as ng from "@angular/core"; @ng.Component({}) class C { public value = ng.model.required<number>(); }',
    },
    {
      code: 'import { Component, inject } from "@angular/core"; @Component({}) class C { public service = inject(Service); }',
      errors: [{ messageId: "publicInjectMember", type: "Identifier" }],
      output:
        'import { Component, inject } from "@angular/core"; @Component({}) class C { protected service = inject(Service); }',
    },
    {
      code: 'import { Component, inject } from "@angular/core"; @Component({}) class C { service = inject(Service); }',
      errors: [{ messageId: "publicInjectMember", type: "Identifier" }],
      output:
        'import { Component, inject } from "@angular/core"; @Component({}) class C { protected service = inject(Service); }',
    },
    {
      code: 'import * as ng from "@angular/core"; @ng.Component({}) class C { public service = ng.inject(Service); }',
      errors: [{ messageId: "publicInjectMember", type: "Identifier" }],
      output:
        'import * as ng from "@angular/core"; @ng.Component({}) class C { protected service = ng.inject(Service); }',
    },
  ],
});
