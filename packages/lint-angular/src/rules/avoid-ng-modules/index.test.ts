import { run } from "oxlint-vitest-rule-tester";
import avoidNgModules from "./index.js";

await run({
  name: "avoid-ng-modules",
  rule: avoidNgModules,
  valid: [
    'import { Component } from "@angular/core"; @Component({ standalone: true }) export class FeaturePage {}',
    'import { provideRouter } from "@angular/router"; export const appConfig = { providers: [provideRouter([])] };',
    "const notDecorator = NgModule;",
    'import { NgModule } from "@angular/core"; @NgModule({ imports: [CommonModule], exports: [CommonModule] }) class SharedModule {}',
    {
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [StoreModule.forRoot({})] }) class AppModule {}',
      options: [{ allowForProviding: true }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forChild(routes)] }) class AuthModule {}',
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
      code: 'import { NgModule } from "@angular/core"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [StoreModule.forRoot({})] }) class AppModule {}',
      errors: [{ messageId: "avoidForRoot", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; const routes = []; @NgModule({ imports: [RouterModule.forChild(routes)] }) class AuthModule {}',
      errors: [{ messageId: "avoidRouterForChild", type: "CallExpression" }],
    },
    {
      code: 'import { NgModule } from "@angular/core"; import { RouterModule } from "@angular/router"; import { StoreModule } from "@ngrx/store"; @NgModule({ imports: [RouterModule.forChild(routes), StoreModule.forRoot({})] }) class AppModule {}',
      errors: [
        { messageId: "avoidRouterForChild", type: "CallExpression" },
        { messageId: "avoidForRoot", type: "CallExpression" },
      ],
    },
    {
      code: 'import { ModuleWithProviders, NgModule } from "@angular/core"; @NgModule({}) class SharedModule { static forRoot(): ModuleWithProviders<SharedModule> { return { ngModule: SharedModule, providers: [] }; } }',
      errors: [{ messageId: "avoidForRoot", type: "Identifier" }],
    },
  ],
});
