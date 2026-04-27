import type { Rule } from "@oxlint/plugins";
import type { RuleTester } from "oxlint/plugins-dev";

export type OxlintRuleTesterConfig = RuleTester.Config;
export type OxlintValidTestCase = RuleTester.ValidTestCase;
export type OxlintInvalidTestCase = RuleTester.InvalidTestCase;
export type OxlintErrorEntry = RuleTester.Error;

export type EslintLikeFlatConfig = {
  languageOptions?: Record<string, unknown>;
};

export type OxlintCompatValidTestCase<RuleOptions = unknown> =
  | string
  | (OxlintValidTestCase & {
      code: string;
      description?: string;
      skip?: boolean;
      options?: RuleOptions;
      parser?: unknown;
      parserOptions?: Record<string, unknown>;
    });

export type OxlintCompatInvalidTestCase<RuleOptions = unknown, MessageId extends string = string> =
  | string
  | (OxlintInvalidTestCase & {
      code: string;
      description?: string;
      skip?: boolean;
      options?: RuleOptions;
      parser?: unknown;
      parserOptions?: Record<string, unknown>;
      errors?:
        | number
        | (MessageId | OxlintErrorEntry | Record<string, unknown>)[]
        | ((errors: unknown[]) => void | Promise<void>);
    });

export interface OxlintTestCasesOptions<RuleOptions = unknown, MessageId extends string = string> {
  valid?: (OxlintCompatValidTestCase<RuleOptions> | string)[];
  invalid?: (OxlintCompatInvalidTestCase<RuleOptions, MessageId> | string)[];
}

export interface OxlintRuleTesterInitOptions<_RuleOptions = unknown> {
  rule?: Rule;
  name?: string;
  languageOptions?: OxlintRuleTesterConfig["languageOptions"];
  parserOptions?: Record<string, unknown>;
  parser?: unknown;
  configs?: EslintLikeFlatConfig | EslintLikeFlatConfig[];
  cwd?: string;
  eslintCompat?: boolean;
  recursive?: boolean | number | null;
  defaultFilename?: string;
}

export type OxlintRunOptions<RuleOptions = unknown> = OxlintRuleTesterInitOptions<RuleOptions> &
  OxlintTestCasesOptions<RuleOptions> & {
    rule: Rule;
  };

export type OxlintRuleTesterPresetOptions<RuleOptions = unknown> =
  OxlintRuleTesterInitOptions<RuleOptions> & {
    rule: Rule;
  };
