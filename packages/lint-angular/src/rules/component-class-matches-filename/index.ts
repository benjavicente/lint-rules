import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { addAngularCoreDecoratorImport, isAngularCoreDecorator } from "../../utilities/angular.js";
import type { AngularCoreDecoratorImports } from "../../utilities/angular.js";

const COMPONENT_DECORATORS = new Set(["Component"]);

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
    const componentClasses: AnyNode[] = [];
    const decoratorImports: AngularCoreDecoratorImports = {
      decoratorNames: COMPONENT_DECORATORS,
      decoratorLocalNames: new Set<string>(),
      angularNamespaces: new Set<string>(),
    };

    return {
      before() {
        componentClasses.length = 0;
        decoratorImports.decoratorLocalNames.clear();
        decoratorImports.angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          addAngularCoreDecoratorImport(
            specifier as AnyNode,
            COMPONENT_DECORATORS,
            decoratorImports,
          );
        }
      },

      ClassDeclaration(node) {
        const classNode = node as AnyNode;
        if (!Array.isArray(classNode.decorators)) return;
        if (
          classNode.decorators.some((decorator: AnyNode) =>
            isAngularCoreDecorator(context, decorator, decoratorImports),
          )
        ) {
          componentClasses.push(classNode);
        }
      },

      after() {
        const filename = context.filename ?? "";
        const expectedName = getExpectedComponentClassName(filename);
        if (!expectedName) return;
        const baseFilename = filename.split(/[/\\]/u).at(-1) ?? filename;

        const exportedComponent =
          componentClasses.find(
            (candidate) =>
              candidate.parent?.type === "ExportNamedDeclaration" ||
              candidate.parent?.type === "ExportDefaultDeclaration",
          ) ?? null;
        const classNode = exportedComponent ?? componentClasses[0];
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
