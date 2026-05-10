import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { isImportedNamespaceMember, isImportedReference } from "../../utilities/angular.js";

interface RuleOptions {
  disallowInjectInjector?: boolean;
  disallowRunInInjectionContext?: boolean;
}

const DEFAULT_DISALLOW_INJECT_INJECTOR = true;
const DEFAULT_DISALLOW_RUN_IN_INJECTION_CONTEXT = true;
const RUN_IN_INJECTION_CONTEXT_NAMES = new Set(["runInInjectionContext", "runInContext"]);
const INJECT_NAMES = new Set(["inject"]);
const INJECTOR_NAMES = new Set(["Injector"]);

function isInjectCall(context: Context, callNode: AnyNode): boolean {
  const callee = callNode.callee;
  return (
    isImportedReference(context, callee, "@angular/core", INJECT_NAMES) ||
    isImportedNamespaceMember(context, callee, "@angular/core", INJECT_NAMES)
  );
}

function isInjectorReference(context: Context, node: AnyNode | null | undefined): boolean {
  return (
    isImportedReference(context, node, "@angular/core", INJECTOR_NAMES) ||
    isImportedNamespaceMember(context, node, "@angular/core", INJECTOR_NAMES)
  );
}

function isDisallowedInjectInjector(context: Context, callNode: AnyNode): boolean {
  if (!isInjectCall(context, callNode)) return false;
  return isInjectorReference(context, callNode.arguments?.[0]);
}

function isDisallowedRunInInjectionContext(context: Context, callNode: AnyNode): boolean {
  const callee = callNode.callee;
  return (
    isImportedReference(context, callee, "@angular/core", RUN_IN_INJECTION_CONTEXT_NAMES) ||
    isImportedNamespaceMember(context, callee, "@angular/core", RUN_IN_INJECTION_CONTEXT_NAMES)
  );
}

const avoidExplicitInjectionContext = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid explicit injection-context APIs such as inject(Injector) and runInInjectionContext/runInContext.",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          disallowInjectInjector: {
            type: "boolean",
            default: DEFAULT_DISALLOW_INJECT_INJECTOR,
          },
          disallowRunInInjectionContext: {
            type: "boolean",
            default: DEFAULT_DISALLOW_RUN_IN_INJECTION_CONTEXT,
          },
        },
      },
    ],
    messages: {
      avoidInjectInjector:
        "Avoid inject(Injector). Prefer APIs that run in the ambient Angular injection context.",
      avoidRunInInjectionContext:
        "Avoid runInInjectionContext/runInContext. Prefer APIs that run in the ambient Angular injection context.",
    },
  },

  createOnce(context: Context) {
    return {
      CallExpression(node) {
        const callNode = node as AnyNode;
        const options = (context.options[0] ?? {}) as RuleOptions;
        const disallowInjectInjector =
          options.disallowInjectInjector ?? DEFAULT_DISALLOW_INJECT_INJECTOR;
        const disallowRunInInjectionContext =
          options.disallowRunInInjectionContext ?? DEFAULT_DISALLOW_RUN_IN_INJECTION_CONTEXT;

        if (disallowInjectInjector && isDisallowedInjectInjector(context, callNode)) {
          context.report({
            node: callNode.callee,
            messageId: "avoidInjectInjector",
          });
        }

        if (disallowRunInInjectionContext && isDisallowedRunInInjectionContext(context, callNode)) {
          context.report({
            node: callNode.callee,
            messageId: "avoidRunInInjectionContext",
          });
        }
      },
    };
  },
}) satisfies Rule;

export default avoidExplicitInjectionContext;
