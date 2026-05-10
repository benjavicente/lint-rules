import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isImportedNamespaceMember, isImportedReference } from "../../utilities/angular.js";

const COMPONENT_DECORATORS = new Set(["Component"]);

function isComponentDecoratorCall(context: Context, node: AnyNode): boolean {
  const callee = node.callee;
  return (
    isImportedReference(context, callee, "@angular/core", COMPONENT_DECORATORS) ||
    isImportedNamespaceMember(context, callee, "@angular/core", COMPONENT_DECORATORS)
  );
}

function isSingleStyleFileNode(node: AnyNode | null | undefined): boolean {
  if (!node) return false;
  if (node.type === "Literal" || node.type === "StringLiteral") {
    return typeof node.value === "string";
  }
  return node.type === "TemplateLiteral" && node.expressions?.length === 0;
}

const preferStyleUrl = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Angular component styleUrl when there is only one style file.",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      preferStyleUrl: "Use styleUrl instead of styleUrls when a component has one style file.",
    },
  },

  createOnce(context: Context) {
    return {
      CallExpression(node) {
        const call = node as AnyNode;
        if (!isComponentDecoratorCall(context, call)) return;

        const metadata = call.arguments?.[0];
        if (metadata?.type !== "ObjectExpression") return;

        for (const property of metadata.properties ?? []) {
          if (property.type !== "Property") continue;
          if (property.computed) continue;
          if (getPropertyName(property.key) !== "styleUrls") continue;
          if (property.value?.type !== "ArrayExpression") continue;

          const elements = property.value.elements?.filter(Boolean) ?? [];
          if (elements.length !== 1) continue;

          const styleFile = elements[0] as AnyNode;
          if (!isSingleStyleFileNode(styleFile)) continue;

          const keyRange = getRange(property.key);
          const valueRange = getRange(property.value);
          const styleFileRange = getRange(styleFile);

          context.report({
            node: property.key,
            messageId: "preferStyleUrl",
            fix:
              keyRange && valueRange && styleFileRange
                ? (fixer) => [
                    fixer.replaceTextRange(keyRange, "styleUrl"),
                    fixer.replaceTextRange(
                      valueRange,
                      context.sourceCode.text.slice(styleFileRange[0], styleFileRange[1]),
                    ),
                  ]
                : undefined,
          });
        }
      },
    };
  },
}) satisfies Rule;

export default preferStyleUrl;
