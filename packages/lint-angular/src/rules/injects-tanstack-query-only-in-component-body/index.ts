import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator, isImportedReference } from "../../utilities/angular.js";

const TARGET_DECORATORS = new Set(["Component", "Directive"]);
const TANSTACK_QUERY_APIS = new Set(["injectQuery", "injectMutation"]);
const TANSTACK_QUERY_SOURCES = new Set(["@tanstack/angular-query", "@benjavicente/angular-query"]);
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

function isTanstackQueryInjectCall(context: Context, callNode: AnyNode): boolean {
  return [...TANSTACK_QUERY_SOURCES].some((source) =>
    isImportedReference(context, callNode.callee, source, TANSTACK_QUERY_APIS),
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

const injectsTanstackQueryOnlyInComponentBody = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Angular TanStack Query injectQuery/injectMutation calls to be direct component/directive class fields.",
      recommended: true,
    },
    schema: [],
    messages: {
      onlyInComponentBody:
        "Call {{name}} only as a direct class field initializer in an Angular component or directive.",
    },
  },

  createOnce(context: Context) {
    return {
      CallExpression(node) {
        const callNode = node as AnyNode;
        if (!isTanstackQueryInjectCall(context, callNode)) return;
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

export default injectsTanstackQueryOnlyInComponentBody;
