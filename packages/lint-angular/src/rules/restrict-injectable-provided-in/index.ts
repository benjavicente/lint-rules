import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { addAngularCoreDecoratorImport, isAngularCoreDecorator } from "../../utilities/angular.js";
import type { AngularCoreDecoratorImports } from "../../utilities/angular.js";

const ALLOWED_PROVIDED_IN_VALUES = new Set(["root", "platform"]);
const INJECTABLE_DECORATORS = new Set(["Injectable"]);

function getInjectableMetadata(
  context: Context,
  node: AnyNode,
  decoratorImports: AngularCoreDecoratorImports,
): AnyNode | null {
  if (node.type !== "Decorator") return null;
  if (!isAngularCoreDecorator(context, node, decoratorImports)) return null;

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
        "@Injectable providedIn should be the literal 'root' or 'platform', not {{actual}}.",
    },
  },

  createOnce(context: Context) {
    const decoratorImports: AngularCoreDecoratorImports = {
      decoratorNames: INJECTABLE_DECORATORS,
      decoratorLocalNames: new Set<string>(),
      angularNamespaces: new Set<string>(),
    };

    return {
      before() {
        decoratorImports.decoratorLocalNames.clear();
        decoratorImports.angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          addAngularCoreDecoratorImport(
            specifier as AnyNode,
            INJECTABLE_DECORATORS,
            decoratorImports,
          );
        }
      },

      Decorator(node) {
        const metadata = getInjectableMetadata(context, node as AnyNode, decoratorImports);
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
