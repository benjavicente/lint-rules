import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";

interface FilenameSuffixConvention {
  kind: string;
  suffix: string;
  decoratorNames: Set<string>;
}

const FILENAME_SUFFIX_CONVENTIONS: readonly FilenameSuffixConvention[] = [
  { kind: "component", suffix: ".component.ts", decoratorNames: new Set(["Component"]) },
  { kind: "directive", suffix: ".directive.ts", decoratorNames: new Set(["Directive"]) },
  { kind: "service", suffix: ".service.ts", decoratorNames: new Set(["Service", "Injectable"]) },
] as const;

function getBaseFilename(filename: string): string {
  return filename.split(/[/\\]/u).at(-1) ?? filename;
}

function isTypeScriptFile(filename: string): boolean {
  return getBaseFilename(filename).endsWith(".ts");
}

function getMatchingConvention(
  context: Context,
  decorator: AnyNode,
): FilenameSuffixConvention | null {
  return (
    FILENAME_SUFFIX_CONVENTIONS.find((convention) =>
      isAngularCoreDecorator(context, decorator, convention.decoratorNames),
    ) ?? null
  );
}

const decoratorFilenameSuffix = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Angular component, directive, and service decorators to be declared in files with matching suffixes.",
      recommended: true,
    },
    schema: [],
    messages: {
      filenameSuffix:
        "Angular {{kind}} decorator should be declared in a file ending with '{{suffix}}'.",
    },
  },

  createOnce(context: Context) {
    return {
      before() {
        if (!isTypeScriptFile(context.filename ?? "")) return false;
      },

      Decorator(node) {
        const convention = getMatchingConvention(context, node as AnyNode);
        if (!convention) return;

        const filename = context.filename ?? "";
        if (getBaseFilename(filename).endsWith(convention.suffix)) return;

        context.report({
          node,
          messageId: "filenameSuffix",
          data: {
            kind: convention.kind,
            suffix: convention.suffix,
          },
        });
      },
    };
  },
}) satisfies Rule;

export default decoratorFilenameSuffix;
