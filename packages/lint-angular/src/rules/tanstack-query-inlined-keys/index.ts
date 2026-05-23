import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import {
  DEFAULT_TANSTACK_QUERY_SOURCES,
  getTanstackQueryImportName,
  getTanstackQuerySources,
  QUERY_OPTIONS_BUILDERS,
} from "../../utilities/tanstack-query.js";
import type { TanstackQueryRuleOptions } from "../../utilities/tanstack-query.js";

function getProperty(node: AnyNode, name: string): AnyNode | null {
  for (const property of node.properties ?? []) {
    if (property.type === "Property" && getPropertyName(property.key) === name) {
      return property;
    }
  }

  return null;
}

function isInlineArrayExpression(node: AnyNode | null | undefined): boolean {
  return unwrapExpression(node)?.type === "ArrayExpression";
}

const tanstackQueryInlinedKeys = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require TanStack Query queryOptions() keys to be inline arrays.",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          tanstackQuerySources: {
            type: "array",
            items: { type: "string" },
            default: DEFAULT_TANSTACK_QUERY_SOURCES,
          },
        },
      },
    ],
    messages: {
      inlinedKeys:
        "Inline queryKey as an array in queryOptions(). Query keys are implementation details and should be read through query options.",
    },
  },

  createOnce(context: Context) {
    let tanstackQuerySources = new Set(DEFAULT_TANSTACK_QUERY_SOURCES);

    return {
      before() {
        const options = (context.options?.[0] ?? {}) as TanstackQueryRuleOptions;
        tanstackQuerySources = getTanstackQuerySources(options);
      },

      CallExpression(node) {
        const callNode = node as AnyNode;
        const importName = getTanstackQueryImportName(
          context,
          callNode.callee,
          tanstackQuerySources,
        );
        if (!importName || !QUERY_OPTIONS_BUILDERS.has(importName)) return;

        const options = unwrapExpression(callNode.arguments?.[0]);
        if (options?.type !== "ObjectExpression") return;

        const queryKey = getProperty(options, "queryKey");
        if (!queryKey || isInlineArrayExpression(queryKey.value)) return;

        context.report({
          node: queryKey.value ?? queryKey,
          messageId: "inlinedKeys",
        });
      },
    };
  },
}) satisfies Rule;

export default tanstackQueryInlinedKeys;
