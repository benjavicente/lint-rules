import { run } from "oxlint-vitest-rule-tester";
import avoidRxjsStateInComponent from "./index.js";

await run({
  name: "avoid-rxjs-state-in-component",
  rule: avoidRxjsStateInComponent,
  defaultFilename: "user-card.component.ts",
  valid: [
    'import { Component, signal } from "@angular/core"; @Component({}) class UserCard { readonly user = signal<User | null>(null); }',
    'import { Injectable } from "@angular/core"; import { BehaviorSubject } from "rxjs"; @Injectable() class Store { private readonly state$ = new BehaviorSubject(0); }',
    'import { Component } from "@angular/core"; import { Subject } from "not-rxjs"; @Component({}) class UserCard { private readonly state$ = new Subject(); }',
    'import { Component } from "not-angular"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly state$ = new Subject(); }',
    'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly state$ = (() => { const Subject = class {}; return new Subject(); })(); }',
    'import { Component } from "@angular/core"; import * as rxjs from "rxjs"; @Component({}) class UserCard { private readonly state$ = (() => { const rxjs = { Subject: class {} }; return new rxjs.Subject(); })(); }',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; import { BehaviorSubject } from "rxjs"; @Component({}) class UserCard { private readonly state$ = new BehaviorSubject(0); }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Directive } from "@angular/core"; import { ReplaySubject } from "rxjs"; @Directive({}) class UserDirective { private readonly selected$ = new ReplaySubject<User>(1); }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Component } from "@angular/core"; import * as rxjs from "rxjs"; @Component({}) class UserCard { private readonly state$: rxjs.BehaviorSubject<number> = new rxjs.BehaviorSubject(0); }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly selected$ = new Subject<User>(); select(user: User) { this.selected$.next(user); } }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly clicks$ = new Subject<void>(); click() { this.clicks$.next(); } }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly state$ = new Subject<State>(); readonly stateChanges$ = this.state$.asObservable(); }',
      errors: ["avoidRxjsState"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly teardown = new Subject<void>(); ngOnDestroy() { this.teardown.next(); this.teardown.complete(); } }',
      errors: ["avoidDestroySubject"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly anything = new Subject<void>(); ngOnDestroy() { this.anything.next(); cleanup(); this.anything.complete(); } }',
      errors: ["avoidDestroySubject"],
    },
  ],
});
