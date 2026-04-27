import { run } from "oxlint-vitest-rule-tester";
import preferPrivateElements from "./index.js";

await run({
  name: "prefer-private-elements",
  rule: preferPrivateElements,
  defaultFilename: "prefer-private-elements.ts",
  valid: [
    "class Foo { #value = 1; }",
    "class Foo { #method() {} }",
    "class Foo { get #value() { return 1; } }",
    "class Foo { public value = 1; protected other() {} }",
    "class Foo { private constructor() {} }",
    "class Foo { constructor(private readonly value: string) {} }",
    "class Foo { private ['value'] = 1; }",
    "class Foo { private ['value']() {} }",
  ],
  invalid: [
    {
      code: "class Foo { private value: string; }",
      errors: ["preferPrivateElements"],
      output: "class Foo { #value: string; }",
    },
    {
      code: "class Foo { private method() {} }",
      errors: ["preferPrivateElements"],
      output: "class Foo { #method() {} }",
    },
    {
      code: "class Foo { private get value() { return 1; } private set value(next: number) {} method() { this.value = 2; return this.value; } }",
      errors: ["preferPrivateElements"],
      output:
        "class Foo { get #value() { return 1; } set #value(next: number) {} method() { this.#value = 2; return this.#value; } }",
    },
    {
      code: "class Foo { private value = 1; method() { return this.value + 1; } }",
      errors: ["preferPrivateElements"],
      output: "class Foo { #value = 1; method() { return this.#value + 1; } }",
    },
    {
      code: "class Foo { private static value = 1; static read() { return Foo.value; } }",
      errors: ["preferPrivateElements"],
      output: "class Foo { static #value = 1; static read() { return Foo.#value; } }",
    },
    {
      code: "class Foo { private value = 1; method() { return other.value; } }",
      errors: ["preferPrivateElements"],
      output: null,
    },
  ],
});
