import { run } from "oxlint-vitest-rule-tester";
import avoidExplicitSubscriptionManagement from "./index.js";

await run({
  name: "avoid-explicit-subscription-management",
  rule: avoidExplicitSubscriptionManagement,
  defaultFilename: "user-card.component.ts",
  valid: [
    'import { Component } from "@angular/core"; import { toSignal } from "@angular/core/rxjs-interop"; @Component({}) class UserCard { user = toSignal(this.user$); }',
    'import { Injectable } from "@angular/core"; import { firstValueFrom } from "rxjs"; @Injectable() class UserService { async load() { return firstValueFrom(this.http.get("/api/users")); } }',
    'import { Component } from "@angular/core"; import { takeUntilDestroyed } from "@angular/core/rxjs-interop"; @Component({}) class UserCard { ngOnInit() { this.user$.pipe(takeUntilDestroyed()).subscribe(user => this.user = user); } }',
    'import { Directive } from "@angular/core"; import * as rxjsInterop from "@angular/core/rxjs-interop"; @Directive({}) class TrackDirective { init() { this.events.pipe(rxjsInterop.takeUntilDestroyed()).subscribe(); } }',
    'import { Subscription } from "rxjs"; class PlainHelper { private readonly subscription = new Subscription(); stop() { this.subscription.unsubscribe(); } }',
    'import { Injectable } from "@angular/core"; import { Subscription } from "not-rxjs"; @Injectable() class UserService { private readonly subscription = new Subscription(); }',
    'import { Component } from "@angular/core"; @Component({}) class UserCard { readonly channel = { subscribe(listener: () => void) { listener(); } }; start() { this.channel.subscribe(() => this.ready = true); } }',
    'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { ngOnInit() { const Subject = class { subscribe(listener: () => void) { listener(); } }; const source = new Subject(); source.subscribe(() => this.ready = true); } }',
    'import { Component } from "@angular/core"; import { Subscription } from "rxjs"; @Component({}) class UserCard { stop(Subscription: new () => { unsubscribe(): void }) { const subscription = new Subscription(); subscription.unsubscribe(); } }',
    'import { Component } from "@angular/core"; import * as rxjs from "rxjs"; @Component({}) class UserCard { ngOnInit(rxjs: { Subject: new () => { subscribe(listener: () => void): void } }) { const source = new rxjs.Subject(); source.subscribe(() => this.ready = true); } }',
    'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly source = new Subject<void>(); ngOnInit() { const source = { subscribe(listener: () => void) { listener(); } }; source.subscribe(() => this.ready = true); } }',
    'import { Component } from "not-angular"; import { Subscription } from "rxjs"; @Component({}) class UserCard { private readonly subscription = new Subscription(); stop() { this.subscription.unsubscribe(); } }',
  ],
  invalid: [
    {
      code: 'import { Component } from "@angular/core"; import { Subscription } from "rxjs"; @Component({}) class UserCard { private readonly subscriptions = new Subscription(); }',
      errors: ["explicitSubscriptionConstructor"],
    },
    {
      code: 'import { Directive } from "@angular/core"; import { Subscription as RxSubscription } from "rxjs"; @Directive({}) class TrackDirective { private subscription?: RxSubscription; }',
      errors: ["explicitSubscriptionType"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; import * as rxjs from "rxjs"; @Injectable() class UserService { private readonly subscriptions: rxjs.Subscription[] = []; }',
      errors: ["explicitSubscriptionType"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject } from "rxjs"; @Component({}) class UserCard { private readonly user$ = new Subject<User>(); ngOnInit() { this.user$.subscribe(user => this.user = user); } }',
      errors: ["explicitSubscribe"],
    },
    {
      code: 'import { Component } from "@angular/core"; @Component({}) class UserCard { ngOnInit() { this.user$.subscribe(user => this.user = user); } }',
      errors: ["explicitSubscribe"],
    },
    {
      code: 'import { Component } from "@angular/core"; @Component({}) class UserCard { ngOnInit() { const events$ = getEvents(); events$.subscribe(); } }',
      errors: ["explicitSubscribe"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Subject, Subscription } from "rxjs"; @Component({}) class UserCard { private readonly user$ = new Subject<User>(); private readonly subscriptions = new Subscription(); ngOnInit() { this.subscriptions.add(this.user$.subscribe()); } }',
      errors: ["explicitSubscriptionConstructor", "explicitSubscriptionAdd"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { Observable, Subscription } from "rxjs"; @Component({}) class UserCard { private readonly user$!: Observable<User>; private subscription?: Subscription; ngOnInit() { this.subscription = this.user$.subscribe(); } ngOnDestroy() { this.subscription?.unsubscribe(); } }',
      errors: ["explicitSubscriptionType", "explicitSubscribe", "explicitUnsubscribe"],
    },
    {
      code: 'import { Directive } from "@angular/core"; import * as rxjs from "rxjs"; @Directive({}) class TrackDirective { private readonly events = new rxjs.Subject<void>(); ngOnInit() { const subscription = this.events.subscribe(); subscription.unsubscribe(); } }',
      errors: ["explicitSubscribe", "explicitUnsubscribe"],
    },
    {
      code: 'import { Component } from "@angular/core"; import { ReplaySubject } from "rxjs"; @Component({}) class UserCard { private readonly user$ = new ReplaySubject<User>(1); ngOnInit() { const subscription = this.user$.subscribe(); this.subscriptions.add(subscription); } }',
      errors: ["explicitSubscribe", "explicitSubscriptionAdd"],
    },
    {
      code: 'import { Injectable } from "@angular/core"; import * as rxjs from "rxjs"; @Injectable() class UserService { private readonly bag = new rxjs.Subscription(); destroy() { this.bag.unsubscribe(); } }',
      errors: ["explicitSubscriptionConstructor", "explicitUnsubscribe"],
    },
  ],
});
