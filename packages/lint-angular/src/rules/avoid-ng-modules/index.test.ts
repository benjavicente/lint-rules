import { run } from "oxlint-vitest-rule-tester";
import avoidNgModules from "./index.js";

await run({
  name: "avoid-ng-modules",
  rule: avoidNgModules,
  valid: [
    'import { Component } from "@angular/core"; @Component({ standalone: true }) export class FeaturePage {}',
    'import { provideRouter } from "@angular/router"; export const appConfig = { providers: [provideRouter([])] };',
    "const notDecorator = NgModule;",
    'import { NgModule } from "not-angular"; @NgModule({ imports: [StoreModule.forRoot({})] }) class OtherModule {}',
    'import { NgModule } from "@angular/core"; @NgModule({ imports: [CommonModule], exports: [CommonModule] }) class SharedModule {}',
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [StoreModule.forRoot({})] }) class AppModule {}',
      options: [{ allowForProviding: true }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forChild(routes)] }) class AuthModule {}',
      options: [{ allowForRouting: true }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forRoot(routes)] }) class AppModule {}',
      options: [{ allowForRouting: true }],
    },
  ],
  invalid: [
    {
      code: 'import { CommonModule, NgModule } from "@angular/core"; @NgModule({ imports: [CommonModule], exports: [CommonModule] }) class SharedModule {}',
      options: [{ allowForGrouping: false }],
      errors: ["avoidModuleImportsExports"],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@my-org/store"; @NgModule({ imports: [StoreModule.forRoot({})] }) class AppModule {}',
      errors: [{ messageId: "avoidForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [StoreModule.forRoot({})] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxStoreForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule as NgrxStoreModule } from "@ngrx/store"; @NgModule({ imports: [NgrxStoreModule.forRoot({})] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxStoreForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import * as NgrxStore from "@ngrx/store"; @NgModule({ imports: [NgrxStore.StoreModule.forRoot({})] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxStoreForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { EffectsModule } from "@ngrx/effects"; @NgModule({ imports: [EffectsModule.forRoot([])] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxEffectsForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [StoreModule.forFeature("auth", {})] }) class AuthModule {}',
      errors: [{ messageId: "avoidNgrxStoreForFeature", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { EffectsModule } from "@ngrx/effects"; @NgModule({ imports: [EffectsModule.forFeature([AuthEffects]) ] }) class AuthModule {}',
      errors: [{ messageId: "avoidNgrxEffectsForFeature", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreDevtoolsModule } from "@ngrx/store-devtools"; @NgModule({ imports: [StoreDevtoolsModule.instrument({ maxAge: 25 })] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxStoreDevtoolsInstrument", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreRouterConnectingModule } from "@ngrx/router-store"; @NgModule({ imports: [StoreRouterConnectingModule.forRoot()] }) class AppModule {}',
      errors: [{ messageId: "avoidNgrxRouterStoreForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forRoot(routes)] }) class AppModule {}',
      errors: [{ messageId: "avoidRouterForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule as Router } from "@angular/router"; const routes = []; @NgModule({ imports: [Router.forRoot(routes)] }) class AppModule {}',
      errors: [{ messageId: "avoidRouterForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import * as AngularRouter from "@angular/router"; const routes = []; @NgModule({ imports: [AngularRouter.RouterModule.forChild(routes)] }) class AppModule {}',
      errors: [{ messageId: "avoidRouterForChild", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forChild(routes)] }) class AuthModule {}',
      errors: [{ messageId: "avoidRouterForChild", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [RouterModule.forChild(routes), StoreModule.forRoot({})] }) class AppModule {}',
      errors: [
        { messageId: "avoidRouterForChild", type: "CallExpression" },
        { messageId: "avoidNgrxStoreForRoot", type: "CallExpression" },
      ],
    },
    {
      code: 'import { ModuleWithProviders, NgModule } from "@angular/core"; @NgModule({}) class SharedModule { static forRoot(): ModuleWithProviders<SharedModule> { return { ngModule: SharedModule, providers: [] }; } }',
      errors: [{ messageId: "avoidForRoot", type: "Identifier" }],
    },
  ],
});
