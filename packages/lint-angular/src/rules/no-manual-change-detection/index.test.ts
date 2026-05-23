import { run } from "oxlint-vitest-rule-tester";
import noManualChangeDetection from "./index.js";

await run({
  name: "no-manual-change-detection",
  rule: noManualChangeDetection,
  defaultFilename: "user-card.component.ts",
  valid: [
    'import { ChangeDetectorRef } from "@angular/core"; class UserCard { constructor(private readonly cdr: ChangeDetectorRef) {} refresh() { console.log(this.cdr); } }',
    "class UserCard { refresh() { this.cdr.detectChanges(); } }",
    'import { ChangeDetectorRef } from "./core"; class UserCard { constructor(private readonly cdr: ChangeDetectorRef) {} refresh() { this.cdr.detectChanges(); } }',
    'import { ComponentFixture } from "@angular/core/testing"; let fixture: ComponentFixture<UserCard>; fixture.detectChanges();',
    'import { ChangeDetectorRef } from "@angular/core"; class UserCard { refresh(cdr: ChangeDetectorRef) { cdr.detectChanges(); } }',
    'import { ChangeDetectorRef } from "@angular/core"; class UserCard { constructor(private readonly cdr: ChangeDetectorRef) {} refresh() { const cdr = { detectChanges() {} }; cdr.detectChanges(); } }',
  ],
  invalid: [
    {
      code: 'import { ChangeDetectorRef } from "@angular/core"; class UserCard { constructor(private readonly cdr: ChangeDetectorRef) {} refresh() { this.cdr.detectChanges(); } }',
      errors: ["noManualChangeDetection"],
    },
    {
      code: 'import { ChangeDetectorRef } from "@angular/core"; class UserCard { constructor(cdr: ChangeDetectorRef) { cdr.markForCheck(); } }',
      errors: ["noManualChangeDetection"],
    },
    {
      code: 'import { ChangeDetectorRef, inject } from "@angular/core"; class UserCard { private readonly cdr = inject(ChangeDetectorRef); refresh() { this.cdr.detach(); this.cdr.reattach(); } }',
      errors: ["noManualChangeDetection", "noManualChangeDetection"],
    },
    {
      code: 'import { ChangeDetectorRef, inject } from "@angular/core"; class UserCard { private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef); refresh() { this.cdr.checkNoChanges(); } }',
      errors: ["noManualChangeDetection"],
    },
    {
      code: 'import * as core from "@angular/core"; class UserCard { constructor(private readonly cdr: core.ChangeDetectorRef) {} refresh() { this.cdr.detectChanges(); } }',
      errors: ["noManualChangeDetection"],
    },
    {
      code: 'import * as core from "@angular/core"; import { inject } from "@angular/core"; class UserCard { private readonly cdr = inject(core.ChangeDetectorRef); refresh() { this.cdr.detectChanges(); } }',
      errors: ["noManualChangeDetection"],
    },
  ],
});
