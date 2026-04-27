import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";

function toPascalCase(raw: string): string {
  return raw
    .split(/[-_\s.]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getExpectedComponentClassName(filename: string): string | null {
  const base = filename.split(/[/\\]/u).at(-1) ?? "";
  const match = /^(.*)\.component\.ts$/u.exec(base);
  if (!match) return null;
  const stem = match[1];
  const pascal = toPascalCase(stem);
  return pascal ? `${pascal}Component` : null;
}

const componentClassMatchesFilename = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Require the component class name to match its *.component.ts filename.",
      recommended: true,
    },
    schema: [],
    messages: {
      classNameMismatch:
        "Component class name should be '{{expectedName}}' to match the filename '{{filename}}'.",
    },
  },

  createOnce(context: Context) {
    const classDeclarations: AnyNode[] = [];

    return {
      before() {
        classDeclarations.length = 0;
      },

      ClassDeclaration(node) {
        classDeclarations.push(node as AnyNode);
      },

      after() {
        const filename = context.filename ?? "";
        const expectedName = getExpectedComponentClassName(filename);
        if (!expectedName) return;
        const baseFilename = filename.split(/[/\\]/u).at(-1) ?? filename;

        const exportedClass =
          classDeclarations.find(
            (candidate) =>
              candidate.parent?.type === "ExportNamedDeclaration" ||
              candidate.parent?.type === "ExportDefaultDeclaration",
          ) ?? null;
        const classNode = exportedClass ?? classDeclarations[0];
        if (!classNode?.id?.name) return;

        if (classNode.id.name === expectedName) return;

        context.report({
          node: classNode.id,
          messageId: "classNameMismatch",
          data: {
            expectedName,
            filename: baseFilename,
          },
        });
      },
    };
  },
}) satisfies Rule;

export default componentClassMatchesFilename;
