import path from "node:path";
import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";
import type { RuleTester as OxlintRuleTester } from "oxlint/plugins-dev";

import type {
  OxlintRuleTesterPresetOptions,
  OxlintRuleTesterInitOptions,
  OxlintRunOptions,
  OxlintTestCasesOptions,
} from "./types.js";
import {
  buildMergedBaseLanguageOptions,
  getSkip,
  toOxlintInvalidTestCase,
  toOxlintValidTestCase,
} from "./utils.js";

export function wireVitestToOxlintRuleTester(): void {
  RuleTester.describe = describe;
  RuleTester.it = it;
}

function buildRuleTesterConstructorConfig(
  init: OxlintRuleTesterInitOptions,
  baseLanguageOptions: ReturnType<typeof buildMergedBaseLanguageOptions>,
): OxlintRuleTester.Config {
  return {
    languageOptions: baseLanguageOptions,
    cwd: init.cwd,
    eslintCompat: init.eslintCompat,
    recursive: init.recursive,
  };
}

export async function run<RuleOptions = unknown>(
  options: OxlintRunOptions<RuleOptions>,
): Promise<void> {
  const rule = options.rule;

  wireVitestToOxlintRuleTester();

  const ruleName = options.name ?? "rule-to-test";
  const cwd = options.cwd ?? process.cwd();
  const defaultFilename = options.defaultFilename ?? path.join(cwd, "index.tsx");

  const baseLanguageOptions = buildMergedBaseLanguageOptions(options);
  const testerConfig = buildRuleTesterConstructorConfig(options, baseLanguageOptions);
  const tester = new RuleTester(testerConfig);

  const validAll = options.valid ?? [];
  const invalidAll = options.invalid ?? [];

  const validActive = validAll.filter((c) => !getSkip(c));
  const invalidActive = invalidAll.filter((c) => !getSkip(c));

  const skippedValid = validAll.filter((c) => getSkip(c));
  const skippedInvalid = invalidAll.filter((c) => getSkip(c));

  if (skippedValid.length || skippedInvalid.length) {
    describe(`${ruleName} (skipped)`, () => {
      skippedValid.forEach((c, index) => {
        const raw = typeof c === "string" ? c : ((c as { code?: string }).code ?? "");
        it.skip(`valid #${index}: ${raw.slice(0, 80)}`, () => {});
      });
      skippedInvalid.forEach((c, index) => {
        const raw = typeof c === "string" ? c : ((c as { code?: string }).code ?? "");
        it.skip(`invalid #${index}: ${raw.slice(0, 80)}`, () => {});
      });
    });
  }

  const oxValid = validActive.map((c) =>
    toOxlintValidTestCase(c, baseLanguageOptions, defaultFilename),
  );
  const oxInvalid = invalidActive.map((c) =>
    toOxlintInvalidTestCase(c, rule, baseLanguageOptions, defaultFilename),
  );

  tester.run(ruleName, rule, { valid: oxValid, invalid: oxInvalid });
}

export async function runClassic<RuleOptions = unknown>(
  ruleName: string,
  rule: NonNullable<OxlintRuleTesterInitOptions<RuleOptions>["rule"]>,
  cases: OxlintTestCasesOptions<RuleOptions>,
  init?: Omit<OxlintRuleTesterInitOptions<RuleOptions>, "rule" | "name">,
): Promise<void> {
  return run({
    ...init,
    name: ruleName,
    rule,
    ...cases,
  });
}

export function createRuleTester<RuleOptions = unknown>(
  init: OxlintRuleTesterPresetOptions<RuleOptions>,
) {
  return {
    run: (cases: OxlintTestCasesOptions<RuleOptions>) =>
      run({
        ...init,
        ...cases,
      }),
  };
}
