import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getDecoratorName, getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

const ALLOWED_PROVIDED_IN_VALUES = new Set(["root", "platform"]);

function getInjectableMetadata(node: AnyNode): AnyNode | null {
  if (node.type !== "Decorator") return null;
  if (getDecoratorName(node) !== "Injectable") return null;

  const expression = node.expression;
  if (expression?.type !== "CallExpression") return null;
  const metadata = expression.arguments?.[0];
  return metadata?.type === "ObjectExpression" ? metadata : null;
}

function getProvidedInProperty(metadata: AnyNode): AnyNode | null {
  return (
    (metadata.properties ?? []).find(
      (candidate: AnyNode) =>
        candidate.type === "Property" &&
        !candidate.computed &&
        getPropertyName(candidate.key) === "providedIn",
    ) ?? null
  );
}

function isAllowedProvidedInValue(node: AnyNode | null | undefined): boolean {
  if (!node) return false;
  if (node.type === "Literal" || node.type === "StringLiteral") {
    return typeof node.value === "string" && ALLOWED_PROVIDED_IN_VALUES.has(node.value);
  }
  return false;
}

const restrictInjectableProvidedIn = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Require @Injectable providedIn to be only 'root' or 'platform'.",
      recommended: true,
    },
    schema: [],
    messages: {
      disallowedProvidedIn:
        "@Injectable providedIn should be 'root' or 'platform', not {{actual}}.",
    },
  },

  createOnce(context: Context) {
    return {
      Decorator(node) {
        const metadata = getInjectableMetadata(node as AnyNode);
        if (!metadata) return;

        const providedInProperty = getProvidedInProperty(metadata);
        if (!providedInProperty) return;
        const value = providedInProperty.value as AnyNode | undefined;
        if (isAllowedProvidedInValue(value)) return;

        const actual = context.sourceCode.text.slice(
          value?.range?.[0] ?? providedInProperty.range?.[0] ?? 0,
          value?.range?.[1] ?? providedInProperty.range?.[1] ?? 0,
        );

        context.report({
          node: value ?? providedInProperty,
          messageId: "disallowedProvidedIn",
          data: {
            actual: actual || "this value",
          },
        });
      },
    };
  },
}) satisfies Rule;

export default restrictInjectableProvidedIn;
