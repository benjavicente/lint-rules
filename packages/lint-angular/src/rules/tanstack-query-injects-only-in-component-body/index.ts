import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";
import {
  DEFAULT_TANSTACK_QUERY_SOURCES,
  getTanstackQuerySources,
  isTanstackQueryImportedReference,
} from "../../utilities/tanstack-query.js";
import type { TanstackQueryRuleOptions } from "../../utilities/tanstack-query.js";

const TARGET_DECORATORS = new Set(["Component", "Directive"]);
const TANSTACK_QUERY_APIS = new Set(["injectQuery", "injectMutation"]);
const CLASS_FIELD_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);
const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

function hasTargetDecorator(context: Context, classNode: AnyNode | null | undefined): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, TARGET_DECORATORS),
  );
}

function isTanstackQueryInjectCall(
  context: Context,
  callNode: AnyNode,
  tanstackQuerySources: Set<string>,
): boolean {
  return isTanstackQueryImportedReference(
    context,
    callNode.callee,
    tanstackQuerySources,
    TANSTACK_QUERY_APIS,
  );
}

function isDirectComponentOrDirectiveFieldInitializer(
  context: Context,
  callNode: AnyNode,
): boolean {
  const ancestors = context.sourceCode.getAncestors(callNode) as AnyNode[];
  const classField = ancestors.findLast((ancestor) => CLASS_FIELD_TYPES.has(ancestor.type));
  if (!classField || unwrapExpression(classField.value) !== callNode) return false;

  const classBodyIndex = ancestors.findLastIndex((ancestor) => ancestor.type === "ClassBody");
  if (classBodyIndex === -1) return false;
  const classBody = ancestors[classBodyIndex];

  const hasNestedFunctionBeforeClassBody = ancestors
    .slice(classBodyIndex + 1)
    .some((ancestor) => FUNCTION_TYPES.has(ancestor.type));
  if (hasNestedFunctionBeforeClassBody) return false;

  return hasTargetDecorator(context, classBody?.parent);
}

const tanstackQueryInjectsOnlyInComponentBody = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Angular TanStack Query injectQuery/injectMutation calls to be direct component/directive class fields.",
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
      onlyInComponentBody:
        "Call {{name}} only as a direct class field initializer in an Angular component or directive.",
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
        if (!isTanstackQueryInjectCall(context, callNode, tanstackQuerySources)) return;
        if (isDirectComponentOrDirectiveFieldInitializer(context, callNode)) return;

        context.report({
          node: callNode.callee ?? callNode,
          messageId: "onlyInComponentBody",
          data: { name: callNode.callee?.name ?? "this TanStack Query inject API" },
        });
      },
    };
  },
}) satisfies Rule;

export default tanstackQueryInjectsOnlyInComponentBody;
