import { run } from "oxlint-vitest-rule-tester";
import avoidWritingSignalsInReactiveContext from "./index.js";

await run({
  name: "avoid-writing-signals-in-reactive-context",
  rule: avoidWritingSignalsInReactiveContext,
  valid: [
    'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => console.log(count()));',
    'import { effect, computed, signal } from "@angular/core"; const count = signal(0); const doubled = computed(() => count() * 2); effect(() => console.log(doubled()));',
    'import { effect } from "@angular/core"; const plain = { set(v: number) {} }; effect(() => plain.set(1));',
    'import * as ng from "@angular/core"; const count = ng.signal(0); ng.effect(() => console.log(count()));',
    'import { effect, signal } from "@angular/core"; const count = signal(0); function update() { count.set(1); } effect(() => console.log(count()));',
    'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => { queueMicrotask(() => count.set(1)); });',
    'import { Component, effect, signal } from "@angular/core"; @Component({}) class C { count = signal(0); constructor() { effect(() => { someObservable.subscribe({ next: () => this.count.set(1) }); }); } }',
    'import { effect, signal } from "@angular/core"; const count = signal(0); function load(effect: (callback: () => void) => void) { effect(() => count.set(1)); }',
    'import { effect, signal } from "@angular/core"; function load(signal: (value: number) => { set(value: number): void }) { const count = signal(0); effect(() => count.set(1)); }',
    'import * as ng from "@angular/core"; const count = ng.signal(0); function load(ng: { effect(callback: () => void): void }) { ng.effect(() => count.set(1)); }',
    'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => { const count = { set(value: number) {} }; count.set(1); });',
    'import { effect, signal } from "@angular/core"; const count = signal(0); effect((count: { set(value: number): void }) => count.set(1));',
    {
      code: 'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => count.set(1));',
      options: [{ allowEffects: true }],
    },
    {
      code: 'import { computed, signal } from "@angular/core"; const count = signal(0); const doubled = computed(() => { count.set(1); return count() * 2; });',
      options: [{ allowComputedAndLinkedSignals: true }],
    },
  ],
  invalid: [
    {
      code: 'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => { count.set(1); });',
      errors: ["avoidSignalWriteInReactiveContext"],
    },
    {
      code: 'import { effect, signal } from "@angular/core"; const count = signal(0); effect(() => count.update((v) => v + 1));',
      errors: ["avoidSignalWriteInReactiveContext"],
    },
    {
      code: 'import { effect, model } from "@angular/core"; const value = model(0); effect(() => value.set(2));',
      errors: ["avoidSignalWriteInReactiveContext"],
    },
    {
      code: 'import * as ng from "@angular/core"; const count = ng.signal(0); ng.effect(() => count.set(1));',
      errors: ["avoidSignalWriteInReactiveContext"],
    },
    {
      code: 'import { Component, effect, signal } from "@angular/core"; @Component({}) class C { count = signal(0); constructor() { effect(() => this.count.set(1)); } }',
      errors: ["avoidSignalWriteInReactiveContext"],
    },
    {
      code: 'import { computed, signal } from "@angular/core"; const count = signal(0); const doubled = computed(() => { count.set(1); return count() * 2; });',
      errors: [{ messageId: "avoidSignalWriteInReactiveContext", type: "Identifier" }],
    },
    {
      code: 'import { linkedSignal, signal } from "@angular/core"; const count = signal(0); const linked = linkedSignal(() => { count.update((v) => v + 1); return count(); });',
      errors: [{ messageId: "avoidSignalWriteInReactiveContext", type: "Identifier" }],
    },
    {
      code: 'import { linkedSignal, signal } from "@angular/core"; const count = signal(0); const linked = linkedSignal({ source: count, computation: () => { count.set(1); return count(); } });',
      errors: [{ messageId: "avoidSignalWriteInReactiveContext", type: "Identifier" }],
    },
  ],
});
