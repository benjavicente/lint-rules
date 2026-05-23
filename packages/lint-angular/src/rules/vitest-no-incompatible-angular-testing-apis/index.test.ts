import { run } from "oxlint-vitest-rule-tester";
import vitestNoIncompatibleAngularTestingApis from "./index.js";

await run({
  name: "vitest-no-incompatible-angular-testing-apis",
  rule: vitestNoIncompatibleAngularTestingApis,
  defaultFilename: "user-card.component.spec.ts",
  valid: [
    'import { TestBed } from "@angular/core/testing"; beforeEach(() => TestBed.configureTestingModule({}));',
    'import { fakeAsync } from "./testing"; it("works", fakeAsync(() => {}));',
    'function fakeAsync(callback: () => void) { return callback; } it("works", fakeAsync(() => {}));',
    'import * as testing from "@angular/core/testing"; function run(testing: { fakeAsync(): void }) { testing.fakeAsync(); }',
  ],
  invalid: [
    {
      code: 'import { fakeAsync } from "@angular/core/testing"; it("works", fakeAsync(() => {}));',
      errors: ["vitestNoIncompatibleAngularTestingApi"],
    },
    {
      code: 'import { flush as flushTimers, waitForAsync } from "@angular/core/testing"; beforeEach(waitForAsync(() => {})); flushTimers();',
      errors: ["vitestNoIncompatibleAngularTestingApi", "vitestNoIncompatibleAngularTestingApi"],
    },
    {
      code: 'import { tick, flushMicrotasks, discardPeriodicTasks, resetFakeAsyncZone } from "@angular/core/testing"; beforeEach(() => resetFakeAsyncZone()); tick(100); flushMicrotasks(); discardPeriodicTasks();',
      errors: [
        "vitestNoIncompatibleAngularTestingApi",
        "vitestNoIncompatibleAngularTestingApi",
        "vitestNoIncompatibleAngularTestingApi",
        "vitestNoIncompatibleAngularTestingApi",
      ],
    },
    {
      code: 'import * as testing from "@angular/core/testing"; it("works", testing.fakeAsync(() => { testing.tick(100); }));',
      errors: ["vitestNoIncompatibleAngularTestingApi", "vitestNoIncompatibleAngularTestingApi"],
    },
  ],
});
