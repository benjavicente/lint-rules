import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import {
  isImportedNamespaceMember,
  isImportedReference,
  isNamespaceImport,
} from "../../utilities/angular.js";
import { getPropertyName } from "../../utilities/ast.js";

const RESOURCE_APIS = new Set(["resource"]);
const RXJS_RESOURCE_APIS = new Set(["rxResource"]);
const HTTP_RESOURCE_APIS = new Set(["httpResource"]);

function isResourceApiCall(context: Context, callNode: AnyNode): boolean {
  const callee = callNode.callee;

  if (isImportedReference(context, callee, "@angular/core", RESOURCE_APIS)) return true;
  if (isImportedNamespaceMember(context, callee, "@angular/core", RESOURCE_APIS)) return true;

  if (isImportedReference(context, callee, "@angular/core/rxjs-interop", RXJS_RESOURCE_APIS)) {
    return true;
  }
  if (
    isImportedNamespaceMember(context, callee, "@angular/core/rxjs-interop", RXJS_RESOURCE_APIS)
  ) {
    return true;
  }

  if (isImportedReference(context, callee, "@angular/common/http", HTTP_RESOURCE_APIS)) return true;
  if (isImportedNamespaceMember(context, callee, "@angular/common/http", HTTP_RESOURCE_APIS)) {
    return true;
  }

  if (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "MemberExpression" &&
    callee.object.object?.type === "Identifier" &&
    isNamespaceImport(context, callee.object.object, "@angular/common/http") &&
    HTTP_RESOURCE_APIS.has(getPropertyName(callee.object.property) ?? "")
  ) {
    return true;
  }

  return (
    callee?.type === "MemberExpression" &&
    isImportedReference(context, callee.object, "@angular/common/http", HTTP_RESOURCE_APIS)
  );
}

const noResourceApi = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow Angular resource APIs in favor of a dedicated server-state library.",
      recommended: true,
    },
    schema: [],
    messages: {
      noResourceApi:
        "Avoid Angular resource APIs for server state. Prefer a dedicated server-state helper such as TanStack Query.",
    },
  },

  createOnce(context: Context) {
    return {
      CallExpression(node) {
        const callNode = node as AnyNode;
        if (!isResourceApiCall(context, callNode)) return;

        context.report({
          node: callNode.callee ?? callNode,
          messageId: "noResourceApi",
        });
      },
    };
  },
}) satisfies Rule;

export default noResourceApi;
