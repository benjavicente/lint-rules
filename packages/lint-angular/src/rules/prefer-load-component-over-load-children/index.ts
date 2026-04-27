import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

function isRoutesTypeAnnotation(node: AnyNode | null | undefined): boolean {
  const typeAnnotation = node?.typeAnnotation;
  if (!typeAnnotation || typeAnnotation.type !== "TSTypeAnnotation") return false;
  const annotation = typeAnnotation.typeAnnotation;
  if (!annotation || annotation.type !== "TSTypeReference") return false;
  return getPropertyName(annotation.typeName as AnyNode) === "Routes";
}

function isExportedConstDeclarator(node: AnyNode): boolean {
  if (node.type !== "VariableDeclarator") return false;
  const declaration = node.parent as AnyNode | undefined;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return false;
  const exportDeclaration = declaration.parent as AnyNode | undefined;
  return exportDeclaration?.type === "ExportNamedDeclaration";
}

function visitNodes(
  node: AnyNode | AnyNode[] | null | undefined,
  visitor: (node: AnyNode) => void,
): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) visitNodes(item, visitor);
    return;
  }

  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    visitNodes(value as AnyNode | AnyNode[], visitor);
  }
}

const preferLoadComponentOverLoadChildren = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Prefer lazy loading route components with loadComponent and disallow loadChildren in exported Routes arrays.",
      recommended: true,
    },
    schema: [],
    messages: {
      avoidLoadChildren:
        "Avoid loadChildren in Routes arrays; prefer loadComponent for lazy-loading standalone route components.",
    },
  },

  createOnce(context: Context) {
    return {
      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        if (!isExportedConstDeclarator(declarator)) return;
        if (declarator.id?.type !== "Identifier") return;
        if (!isRoutesTypeAnnotation(declarator.id)) return;
        if (declarator.init?.type !== "ArrayExpression") return;

        visitNodes(declarator.init.elements as AnyNode[], (current) => {
          if (current.type !== "Property" || current.computed) return;
          if (getPropertyName(current.key) !== "loadChildren") return;

          context.report({
            node: current.key ?? current,
            messageId: "avoidLoadChildren",
          });
        });
      },
    };
  },
}) satisfies Rule;

export default preferLoadComponentOverLoadChildren;
