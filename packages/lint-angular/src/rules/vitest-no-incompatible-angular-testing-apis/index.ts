import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isImportedNamespaceMember } from "../../utilities/angular.js";

const ANGULAR_TESTING_SOURCE = "@angular/core/testing";
const VITEST_INCOMPATIBLE_APIS = new Set([
  "discardPeriodicTasks",
  "fakeAsync",
  "flush",
  "flushMicrotasks",
  "resetFakeAsyncZone",
  "tick",
  "waitForAsync",
]);

function getIncompatibleImportName(specifier: AnyNode): string | null {
  if (specifier.type !== "ImportSpecifier") return null;

  const importedName = getPropertyName(specifier.imported);
  return importedName && VITEST_INCOMPATIBLE_APIS.has(importedName) ? importedName : null;
}

function isIncompatibleNamespaceCall(context: Context, callNode: AnyNode): boolean {
  return isImportedNamespaceMember(
    context,
    callNode.callee,
    ANGULAR_TESTING_SOURCE,
    VITEST_INCOMPATIBLE_APIS,
  );
}

const vitestNoIncompatibleAngularTestingApis = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Angular testing APIs that depend on Zone.js and are incompatible with Vitest.",
      recommended: true,
    },
    schema: [],
    messages: {
      vitestNoIncompatibleAngularTestingApi:
        "Avoid Angular testing API '{{name}}'. It depends on Zone.js and is not compatible with Angular tests running on Vitest.",
    },
  },

  createOnce(context: Context) {
    return {
      ImportDeclaration(node) {
        const importNode = node as AnyNode;
        if (importNode.source?.value !== ANGULAR_TESTING_SOURCE) return;

        for (const specifier of importNode.specifiers ?? []) {
          const name = getIncompatibleImportName(specifier);
          if (!name) continue;

          context.report({
            node: specifier,
            messageId: "vitestNoIncompatibleAngularTestingApi",
            data: { name },
          });
        }
      },

      CallExpression(node) {
        const callNode = node as AnyNode;
        if (!isIncompatibleNamespaceCall(context, callNode)) return;

        context.report({
          node: callNode.callee,
          messageId: "vitestNoIncompatibleAngularTestingApi",
          data: { name: getPropertyName(callNode.callee?.property) ?? "this API" },
        });
      },
    };
  },
}) satisfies Rule;

export default vitestNoIncompatibleAngularTestingApis;
