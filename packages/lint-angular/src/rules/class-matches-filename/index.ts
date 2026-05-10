import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";

type AngularClassKind = "component" | "directive" | "service";

interface RuleOptions {
  ignoreClassSuffix?: boolean | Partial<Record<AngularClassKind, boolean>>;
}

interface ClassFilenameMatcher {
  pattern: RegExp;
  decoratorNames: readonly string[];
}

const CLASS_FILENAME_MATCHERS: readonly ClassFilenameMatcher[] = [
  { pattern: /^(.*)\.component\.ts$/u, decoratorNames: ["Component"] },
  { pattern: /^(.*)\.directive\.ts$/u, decoratorNames: ["Directive"] },
  { pattern: /^(.*)\.service\.ts$/u, decoratorNames: ["Service", "Injectable"] },
] as const;

function toPascalCase(raw: string): string {
  return raw
    .split(/[-_\s.]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getClassKind(suffix: string): AngularClassKind {
  return suffix.toLowerCase() as AngularClassKind;
}

function getExpectedClassNames(filename: string, ignoreClassSuffix: boolean): string[] | null {
  const base = filename.split(/[/\\]/u).at(-1) ?? "";
  for (const { decoratorNames, pattern } of CLASS_FILENAME_MATCHERS) {
    const match = pattern.exec(base);
    if (!match) continue;

    const stem = match[1];
    const pascal = toPascalCase(stem);
    if (!pascal) return null;

    const suffix = decoratorNames[0];
    return ignoreClassSuffix ? [`${pascal}${suffix}`, pascal] : [`${pascal}${suffix}`];
  }

  return null;
}

function getFileMatcher(filename: string): ClassFilenameMatcher | null {
  const base = filename.split(/[/\\]/u).at(-1) ?? "";
  return CLASS_FILENAME_MATCHERS.find(({ pattern }) => pattern.test(base)) ?? null;
}

function getIgnoreClassSuffixOption(options: RuleOptions, kind: AngularClassKind): boolean {
  const ignoreClassSuffix = options.ignoreClassSuffix ?? false;
  if (typeof ignoreClassSuffix === "boolean") return ignoreClassSuffix;
  return ignoreClassSuffix[kind] ?? false;
}

function getFileKind(matcher: ClassFilenameMatcher): AngularClassKind {
  return getClassKind(matcher.decoratorNames[0]);
}

function formatExpectedNames(expectedNames: string[]): string {
  return expectedNames.join("' or '");
}

function getNodeName(node: AnyNode): string | null {
  return node.id?.name ?? null;
}

function getBaseFilename(filename: string): string {
  return filename.split(/[/\\]/u).at(-1) ?? filename;
}

function hasTargetDecorator(
  context: Context,
  classNode: AnyNode,
  decoratorNames: ReadonlySet<string>,
): boolean {
  if (!Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, decoratorNames),
  );
}

function getDecoratedClassCountDescription(count: number): string {
  return count === 0 ? "no decorated classes" : `${count} decorated classes`;
}

const classMatchesFilename = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Angular component, directive, and service class names to match their filenames.",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          ignoreClassSuffix: {
            anyOf: [
              { type: "boolean" },
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  component: { type: "boolean" },
                  directive: { type: "boolean" },
                  service: { type: "boolean" },
                },
              },
            ],
            default: false,
          },
        },
      },
    ],
    messages: {
      classNameMismatch:
        "Angular class name should be '{{expectedName}}' to match the filename '{{filename}}'.",
      decoratedClassCount:
        "Angular filename '{{filename}}' should contain exactly one matching decorated class, but found {{actual}}.",
    },
  },

  createOnce(context: Context) {
    let programNode: AnyNode | null = null;
    let fileMatcher: ClassFilenameMatcher | null = null;
    let fileDecoratorNames: ReadonlySet<string> = new Set<string>();
    const decoratedClasses: AnyNode[] = [];

    return {
      before() {
        programNode = null;
        decoratedClasses.length = 0;

        fileMatcher = getFileMatcher(context.filename ?? "");
        if (!fileMatcher) return false;

        fileDecoratorNames = new Set(fileMatcher.decoratorNames);
      },

      Program(node) {
        programNode = node as AnyNode;
      },

      ClassDeclaration(node) {
        if (!fileMatcher) return;
        const classNode = node as AnyNode;
        if (hasTargetDecorator(context, classNode, fileDecoratorNames)) {
          decoratedClasses.push(classNode);
        }
      },

      after() {
        const filename = context.filename ?? "";
        if (!fileMatcher) return;

        const baseFilename = getBaseFilename(filename);
        if (decoratedClasses.length !== 1) {
          const reportNode = decoratedClasses[0]?.id ?? decoratedClasses[0] ?? programNode;
          if (!reportNode) return;

          context.report({
            node: reportNode,
            messageId: "decoratedClassCount",
            data: {
              actual: getDecoratedClassCountDescription(decoratedClasses.length),
              filename: baseFilename,
            },
          });
          return;
        }

        const options = (context.options[0] ?? {}) as RuleOptions;
        const expectedNames = getExpectedClassNames(
          filename,
          getIgnoreClassSuffixOption(options, getFileKind(fileMatcher)),
        );
        if (!expectedNames) return;

        const classNode = decoratedClasses[0];
        const className = getNodeName(classNode);
        if (!className) return;

        if (expectedNames.includes(className)) return;

        context.report({
          node: classNode.id,
          messageId: "classNameMismatch",
          data: {
            expectedName: formatExpectedNames(expectedNames),
            filename: baseFilename,
          },
        });
      },
    };
  },
}) satisfies Rule;

export default classMatchesFilename;
