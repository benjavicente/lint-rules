import { run } from "oxlint-vitest-rule-tester";
import rulesOfInject from "./index.js";

await run({
  name: "rules-of-inject",
  rule: rulesOfInject,
  valid: [
    'import { inject } from "@angular/core"; const provider = { provide: S, useFactory: () => inject(Service) };',
    'import { inject } from "@angular/core"; const token = new InjectionToken("x", { factory: () => inject(Service) });',
    'import { inject, runInInjectionContext } from "@angular/core"; runInInjectionContext(injector, () => inject(Service));',
    'import { inject } from "@angular/core"; environmentInjector.runInContext(() => inject(Service));',
    'import { inject, runInContext } from "@angular/core"; runInContext(injector, () => inject(Service));',
    'import { inject } from "@angular/core"; const routes = [{ path: "", loadComponent: () => inject(Service) }];',
    'import { inject } from "@angular/core"; const routes = [{ path: "", canActivate: [() => inject(Service)] }];',
    'import { inject } from "@angular/core"; const routes = [{ path: "legacy", redirectTo: () => inject(Router).parseUrl("/login") }];',
    'import { inject } from "@angular/core"; const routes = [{ path: "user/:id", title: () => inject(TitleService).getTitle() }];',
    'import { inject } from "@angular/core"; import type { CanActivateFn } from "@angular/router"; const canActivateTeam: CanActivateFn = () => inject(Service).canActivate();',
    'import { inject } from "@angular/core"; import type { ResolveFn } from "@angular/router"; const heroResolver: ResolveFn<Hero> = () => inject(HeroService).getHero();',
    'import { inject } from "@angular/core"; import type { RedirectFunction } from "@angular/router"; const legacyRedirect: RedirectFunction = () => inject(Router).parseUrl("/login");',
    'import { inject } from "@angular/core"; import type { HttpInterceptorFn } from "@angular/common/http"; const authInterceptor: HttpInterceptorFn = (req, next) => { const auth = inject(AuthService); return next(req); };',
    'import { inject } from "@angular/core"; import type { CanMatchFn } from "@angular/router"; const canMatchTeam = (() => inject(Service).canMatch()) satisfies CanMatchFn;',
    'import { inject } from "@angular/core"; function injextService() { return inject(Service); }',
    'import { inject } from "@angular/core"; const authGuard = () => inject(Service);',
    'import { inject } from "@angular/core"; function authGuard() { return inject(Service); }',
    'import { inject } from "@angular/core"; function injextA() { return injextB(); }',
    'import { inject } from "@angular/core"; function authGuard() { return injextService(); }',
    'import { inject } from "@angular/core"; const provider = { provide: S, useFactory: () => injextService() };',
    'import { inject } from "@angular/core"; const route = { loadComponent: () => injextComponent() };',
    'import { inject } from "@angular/core"; const provider = { provide: S, useFactory: () => authGuard() };',
    {
      code: 'import { inject } from "@angular/core"; function makeService() { return inject(Service); }',
      options: [{ allowedFunctionNames: ["makeService"] }],
    },
    {
      code: 'import { inject } from "@angular/core"; function useService() { return inject(Service); }',
      options: [{ injectFunctionPrefixes: ["use"] }],
    },
    {
      code: 'import { inject } from "@angular/core"; function authPolicy() { return inject(Service); }',
      options: [{ injectFunctionSuffixes: ["Policy"] }],
    },
    {
      code: 'import { inject } from "@angular/core"; function useService() { return useOther(); }',
      options: [{ injectFunctionPrefixes: ["use"] }],
    },
    {
      code: 'import { storage } from "@signality/core"; function injextLoad() { return storage("k", 123); }',
      options: [
        {
          runsInInjectionContext: [{ from: "@signality/core", imports: ["storage"] }],
        },
      ],
    },
    'import { Component, inject } from "@angular/core"; @Component({}) class C { service = inject(Service); }',
    'import { Component, inject } from "@angular/core"; @Component({}) class C { constructor() { this.service = inject(Service); } }',
    'import { Directive, inject } from "@angular/core"; @Directive({}) class C { service = inject(Service); }',
    'import { Injectable, inject } from "@angular/core"; @Injectable() class C { service = inject(Service); }',
    'import { Pipe, inject } from "@angular/core"; @Pipe({ name: "x" }) class C { service = inject(Service); }',
    'import { NgModule, inject } from "@angular/core"; @NgModule({}) class C { service = inject(Service); }',
    'import * as ng from "@angular/core"; @ng.Component({}) class C { service = ng.inject(Service); }',
    'import { Component } from "@angular/core"; import { toSignal } from "@angular/core/rxjs-interop"; @Component({}) class C { value = toSignal(this.value$); }',
    'import { Component } from "@angular/core"; import * as rxjsInterop from "@angular/core/rxjs-interop"; @Component({}) class C { value = rxjsInterop.toSignal(this.value$); }',
    'import { Component } from "@angular/core"; import { toSignal } from "@angular/core/rxjs-interop"; @Component({}) class C { constructor() { this.value = toSignal(this.value$); } }',
    'import { Component, effect } from "@angular/core"; @Component({}) class C { constructor() { effect(() => this.sync()); } }',
    'import { Component, afterNextRender } from "@angular/core"; @Component({}) class C { ready = afterNextRender(() => this.sync()); }',
    'import { Component } from "@angular/core"; import { toObservable } from "@angular/core/rxjs-interop"; @Component({}) class C { value$ = toObservable(this.value); }',
    'import { Component } from "@angular/core"; import { httpResource } from "@angular/common/http"; @Component({}) class C { user = httpResource(() => "/api/user"); text = httpResource.text(() => "/api/user"); }',
    'import { Component, signal } from "@angular/core"; import { form } from "@angular/forms/signals"; @Component({}) class C { model = signal({ name: "" }); form = form(this.model); }',
    'import { effect } from "@angular/core"; function load(effect: () => void) { effect(); }',
    'import { toSignal } from "@angular/core/rxjs-interop"; function load(toSignal: () => void) { toSignal(); }',
    'import { httpResource } from "@angular/common/http"; function load(httpResource: { text(): string }) { return httpResource.text(); }',
    'import * as core from "@angular/core"; function load(core: { effect(): void }) { core.effect(); }',
    {
      code: "function load(inject: () => void) { inject(); }",
      options: [{ checkUnimportedInject: true }],
    },
  ],
  invalid: [
    {
      code: 'import { inject } from "@angular/core"; const service = inject(Service);',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; function load() { return inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; function load() { return injextService(); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; class C { ngOnInit() { inject(Service); } }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; class C { constructor() { setTimeout(() => inject(Service)); } }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; class C { service = () => inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; class C { service = inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; class C { constructor() { this.service = inject(Service); } }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import * as ng from "@angular/core"; class C { service = ng.inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import * as ng from "@angular/core"; function load() { return ng.inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject as ngInject } from "@angular/core"; class C { service = ngInject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; runInSomething(() => inject(Service));',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; @Custom() class C { service = inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { Component, inject } from "@angular/core"; @Component({}) class C { ngOnInit() { inject(Service); } }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { Component, inject } from "@angular/core"; @Component({}) class C { service = () => inject(Service); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; import type { HttpInterceptorFn } from "@angular/common/http"; const authInterceptor: HttpInterceptorFn = (req, next) => next(req).pipe(catchError(() => inject(Service)));',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; import type { CanActivateFn } from "@angular/router"; const canActivateTeam: CanActivateFn = async () => { await ready(); return inject(Service).canActivate(); };',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; function injextService() { return inject(Service); }',
      options: [{ injectFunctionPrefixes: ["use"], injectFunctionSuffixes: ["Policy"] }],
      errors: ["disallowedInject"],
    },
    {
      code: 'import { inject } from "@angular/core"; function authGuard() { return inject(Service); }',
      options: [{ injectFunctionPrefixes: ["use"], injectFunctionSuffixes: ["Policy"] }],
      errors: ["disallowedInject"],
    },
    {
      code: 'import { storage } from "@signality/core"; function load() { return storage("k", 123); }',
      options: [{ runsInInjectionContext: [{ from: "@signality/core", imports: ["storage"] }] }],
      errors: ["disallowedInject"],
    },
    {
      code: 'import { storage } from "@signality/core"; function load() { return storage("k", 123); }',
      options: [{ runsInInjectionContext: [{ from: "@signality/core", imports: "all" }] }],
      errors: ["disallowedInject"],
    },
    {
      code: 'import { toSignal } from "@angular/core/rxjs-interop"; const value = toSignal(value$);',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { toSignal } from "@angular/core/rxjs-interop"; function load() { return toSignal(value$); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import * as rxjsInterop from "@angular/core/rxjs-interop"; function load() { return rxjsInterop.toSignal(value$); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { effect } from "@angular/core"; function load() { effect(() => sync()); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { afterEveryRender } from "@angular/core"; function load() { afterEveryRender(() => sync()); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { afterNextRender } from "@angular/core"; function load() { afterNextRender(() => sync()); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { afterRenderEffect } from "@angular/core"; function load() { afterRenderEffect(() => sync()); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { assertInInjectionContext } from "@angular/core"; function load() { assertInInjectionContext(load); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { resource } from "@angular/core"; function load() { return resource({ loader: () => Promise.resolve(1) }); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import * as core from "@angular/core"; function load() { core.effect(() => sync()); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { toObservable } from "@angular/core/rxjs-interop"; function load() { return toObservable(value); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { rxResource } from "@angular/core/rxjs-interop"; function load() { return rxResource({ stream: () => source$ }); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { httpResource } from "@angular/common/http"; function load() { return httpResource(() => "/api/user"); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { httpResource } from "@angular/common/http"; function load() { return httpResource.text(() => "/api/user"); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import * as http from "@angular/common/http"; function load() { return http.httpResource.text(() => "/api/user"); }',
      errors: ["disallowedInject"],
    },
    {
      code: 'import { form } from "@angular/forms/signals"; function load(model) { return form(model); }',
      errors: ["disallowedInject"],
    },
  ],
});
