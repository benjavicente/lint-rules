import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

function isComponentDecoratorCall(
  context: Context,
  node: AnyNode,
  componentLocalNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  const callee = node.callee;
  if (callee?.type === "Identifier") {
    return componentLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee);
  }
  return (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "Identifier" &&
    angularNamespaces.has(callee.object.name) &&
    !isShadowedIdentifier(context, callee.object) &&
    getPropertyName(callee.property) === "Component"
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
    const componentLocalNames = new Set<string>();
    const angularNamespaces = new Set<string>();

    return {
      before() {
        componentLocalNames.clear();
        angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (importedName === "Component") componentLocalNames.add(specifier.local.name);
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            angularNamespaces.add(specifier.local.name);
          }
        }
      },

      CallExpression(node) {
        const call = node as AnyNode;
        if (!isComponentDecoratorCall(context, call, componentLocalNames, angularNamespaces)) {
          return;
        }

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
