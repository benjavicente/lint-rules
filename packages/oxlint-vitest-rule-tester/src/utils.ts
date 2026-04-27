import type { Rule } from "@oxlint/plugins";
import type { RuleTester } from "oxlint/plugins-dev";

import type {
  EslintLikeFlatConfig,
  OxlintCompatInvalidTestCase,
  OxlintCompatValidTestCase,
  OxlintInvalidTestCase,
  OxlintRuleTesterConfig,
  OxlintRuleTesterInitOptions,
  OxlintValidTestCase,
} from "./types.js";

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isMergeableObject(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function deepMerge(
  target: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      const sv = source[key];
      const tv = target[key];
      if (isMergeableObject(sv) && isMergeableObject(tv)) {
        deepMerge(tv, sv);
      } else {
        target[key] = sv;
      }
    }
  }
  return target;
}

export function mergeLanguageOptionsLayers(
  ...layers: (OxlintRuleTesterConfig["languageOptions"] | undefined)[]
): OxlintRuleTesterConfig["languageOptions"] | undefined {
  const merged: Record<string, unknown> = {};
  let any = false;
  for (const layer of layers) {
    if (!layer) continue;
    any = true;
    deepMerge(merged, layer as Record<string, unknown>);
  }
  return any ? (merged as OxlintRuleTesterConfig["languageOptions"]) : undefined;
}

export function extractLanguageOptionsFromConfigs(
  configs?: EslintLikeFlatConfig | EslintLikeFlatConfig[],
): OxlintRuleTesterConfig["languageOptions"] | undefined {
  const layers: OxlintRuleTesterConfig["languageOptions"][] = [];
  for (const c of toArray(configs)) {
    if (c.languageOptions) {
      layers.push(c.languageOptions as OxlintRuleTesterConfig["languageOptions"]);
    }
  }
  return mergeLanguageOptionsLayers(...layers);
}

function pickLanguageOptionsFromInit(
  init: OxlintRuleTesterInitOptions,
): OxlintRuleTesterConfig["languageOptions"] | undefined {
  const base = init.languageOptions as Record<string, unknown> | undefined;
  const out: Record<string, unknown> = { ...base };
  if (init.parserOptions) {
    const prev = (out.parserOptions as Record<string, unknown> | undefined) ?? {};
    out.parserOptions = { ...prev, ...init.parserOptions };
  }
  if (init.parser !== undefined) {
    out.parser = init.parser;
  }
  return Object.keys(out).length ? (out as OxlintRuleTesterConfig["languageOptions"]) : undefined;
}

export function buildMergedBaseLanguageOptions(
  init: OxlintRuleTesterInitOptions,
): OxlintRuleTesterConfig["languageOptions"] | undefined {
  return mergeLanguageOptionsLayers(
    extractLanguageOptionsFromConfigs(init.configs),
    pickLanguageOptionsFromInit(init),
  );
}

function isUsingTypeScriptParser(languageOptions: Record<string, unknown> | undefined): boolean {
  const parser = languageOptions?.parser as { meta?: { name?: string } } | undefined;
  return parser?.meta?.name === "typescript-eslint/parser";
}

export function normalizeCompatTestCase(
  c: OxlintCompatValidTestCase | OxlintCompatInvalidTestCase | string,
  baseLanguageOptions: OxlintRuleTesterConfig["languageOptions"] | undefined,
  defaultFilename: string,
  type: "valid" | "invalid",
): Record<string, unknown> {
  const obj: Record<string, unknown> = typeof c === "string" ? { code: c } : { ...(c as object) };
  if (!obj.type) {
    obj.type = type;
  }

  const parserOptions: Record<string, unknown> = {
    ...((baseLanguageOptions as Record<string, unknown> | undefined)?.parserOptions as
      | Record<string, unknown>
      | undefined),
    ...(obj.parserOptions as Record<string, unknown> | undefined),
    ...((obj.languageOptions as Record<string, unknown> | undefined)?.parserOptions as
      | Record<string, unknown>
      | undefined),
  };

  const mergedLanguage: Record<string, unknown> = {
    ...(baseLanguageOptions as Record<string, unknown> | undefined),
    ...(obj.languageOptions as Record<string, unknown> | undefined),
    parser:
      (obj.languageOptions as Record<string, unknown> | undefined)?.parser ??
      obj.parser ??
      (baseLanguageOptions as Record<string, unknown> | undefined)?.parser,
    parserOptions,
  };

  const useTypeScriptParser = isUsingTypeScriptParser(mergedLanguage);

  if (!obj.filename) {
    obj.filename = defaultFilename;
  }

  if (useTypeScriptParser) {
    obj.languageOptions ??= {};
    (obj.languageOptions as Record<string, unknown>).parser = mergedLanguage.parser;
    (obj.languageOptions as Record<string, unknown>).parserOptions = {
      ecmaVersion: "latest",
      sourceType: "module",
      disallowAutomaticSingleRunInference: true,
      ...parserOptions,
    };
  }

  return obj;
}

export function getSkip(
  raw: OxlintCompatValidTestCase | OxlintCompatInvalidTestCase | string,
): boolean {
  if (typeof raw === "string") return false;
  return !!(raw as { skip?: boolean }).skip;
}

function pickOxlintTestCaseKeys(normalized: Record<string, unknown>): Record<string, unknown> {
  const allow = new Set([
    "code",
    "name",
    "only",
    "filename",
    "options",
    "settings",
    "before",
    "after",
    "output",
    "errors",
    "languageOptions",
    "eslintCompat",
    "cwd",
    "recursive",
  ]);
  const out: Record<string, unknown> = {};
  for (const key of allow) {
    if (key in normalized) out[key] = normalized[key];
  }
  return out;
}

export function toOxlintValidTestCase(
  raw: OxlintCompatValidTestCase | string,
  baseLanguageOptions: OxlintRuleTesterConfig["languageOptions"] | undefined,
  defaultFilename: string,
): OxlintValidTestCase {
  const normalized = normalizeCompatTestCase(raw, baseLanguageOptions, defaultFilename, "valid");
  const name =
    (normalized.name as string | undefined) ?? (normalized.description as string | undefined);
  const picked = pickOxlintTestCaseKeys({ ...normalized, ...(name !== undefined ? { name } : {}) });
  delete picked.errors;
  return picked as unknown as OxlintValidTestCase;
}

function normalizeOxlintErrors(errors: unknown, rule: Rule): OxlintInvalidTestCase["errors"] {
  if (typeof errors === "number") return errors;
  if (typeof errors === "function") {
    throw new Error(
      "oxlint-vitest-rule-tester: `errors` as a function is not supported under Oxlint RuleTester.",
    );
  }
  if (!Array.isArray(errors)) {
    throw new Error("oxlint-vitest-rule-tester: invalid test case must specify `errors`.");
  }
  return errors.map((e) => normalizeOneError(e, rule)) as OxlintInvalidTestCase["errors"];
}

function normalizeOneError(e: unknown, rule: Rule): RuleTester.Error {
  if (typeof e === "string") return { messageId: e };
  if (e && typeof e === "object") {
    const clone = { ...(e as Record<string, unknown>) };
    if ("data" in clone && clone.data) {
      if (!clone.messageId) {
        throw new Error("oxlint-vitest-rule-tester: `data` requires `messageId`.");
      }
      if (clone.message) {
        throw new Error("oxlint-vitest-rule-tester: `message` and `data` are mutually exclusive.");
      }
      const template = rule.meta?.messages?.[clone.messageId as string];
      if (!template || typeof template !== "string") {
        const id = clone.messageId;
        const idLabel =
          typeof id === "string" || typeof id === "number" || typeof id === "boolean"
            ? String(id)
            : JSON.stringify(id);
        throw new Error(`oxlint-vitest-rule-tester: unknown messageId '${idLabel}'`);
      }
      clone.message = interpolateMessage(template, clone.data as Record<string, unknown>);
      delete clone.data;
    }
    if ("type" in clone && !("nodeType" in clone)) {
      clone.nodeType = clone.type;
      delete clone.type;
    }
    return clone as RuleTester.Error;
  }
  throw new Error("oxlint-vitest-rule-tester: invalid error entry");
}

function interpolateMessage(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{\{([^{}]+)\}\}/gu, (_full, termWithWhitespace: string) => {
    const term = String(termWithWhitespace).trim();
    return term in data ? String(data[term]) : `{{${termWithWhitespace}}}`;
  });
}

export function toOxlintInvalidTestCase(
  raw: OxlintCompatInvalidTestCase | string,
  rule: Rule,
  baseLanguageOptions: OxlintRuleTesterConfig["languageOptions"] | undefined,
  defaultFilename: string,
): OxlintInvalidTestCase {
  if (typeof raw === "string") {
    throw new Error("oxlint-vitest-rule-tester: invalid cases must be objects with `errors`.");
  }
  const normalized = normalizeCompatTestCase(raw, baseLanguageOptions, defaultFilename, "invalid");
  const name =
    (normalized.name as string | undefined) ?? (normalized.description as string | undefined);
  const errors = normalizeOxlintErrors(normalized.errors, rule);
  const picked = pickOxlintTestCaseKeys({
    ...normalized,
    ...(name !== undefined ? { name } : {}),
    errors,
  });
  return picked as unknown as OxlintInvalidTestCase;
}
