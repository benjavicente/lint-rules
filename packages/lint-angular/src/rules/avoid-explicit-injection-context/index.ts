import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

interface RuleOptions {
  disallowInjectInjector?: boolean;
  disallowRunInInjectionContext?: boolean;
}

const DEFAULT_DISALLOW_INJECT_INJECTOR = true;
const DEFAULT_DISALLOW_RUN_IN_INJECTION_CONTEXT = true;
const RUN_IN_INJECTION_CONTEXT_NAMES = new Set(["runInInjectionContext", "runInContext"]);

function isAngularNamespaceMember(
  context: Context,
  node: AnyNode | null | undefined,
  namespaces: Set<string>,
  memberName: string,
): boolean {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    namespaces.has(node.object.name) &&
    !isShadowedIdentifier(context, node.object) &&
    getPropertyName(node.property) === memberName
  );
}

function isInjectCall(
  context: Context,
  callNode: AnyNode,
  injectNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  const callee = callNode.callee;
  return (
    (callee?.type === "Identifier" &&
      injectNames.has(callee.name) &&
      !isShadowedIdentifier(context, callee)) ||
    isAngularNamespaceMember(context, callee, angularNamespaces, "inject")
  );
}

function isInjectorReference(
  context: Context,
  node: AnyNode | null | undefined,
  injectorNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  return (
    (node?.type === "Identifier" &&
      injectorNames.has(node.name) &&
      !isShadowedIdentifier(context, node)) ||
    isAngularNamespaceMember(context, node, angularNamespaces, "Injector")
  );
}

function isDisallowedInjectInjector(
  context: Context,
  callNode: AnyNode,
  injectNames: Set<string>,
  injectorNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  if (!isInjectCall(context, callNode, injectNames, angularNamespaces)) return false;
  return isInjectorReference(context, callNode.arguments?.[0], injectorNames, angularNamespaces);
}

function isDisallowedRunInInjectionContext(
  context: Context,
  callNode: AnyNode,
  runInInjectionContextNames: Set<string>,
  runInContextNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  const callee = callNode.callee;
  if (callee?.type === "Identifier") {
    return (
      (runInInjectionContextNames.has(callee.name) || runInContextNames.has(callee.name)) &&
      !isShadowedIdentifier(context, callee)
    );
  }

  if (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "Identifier" &&
    angularNamespaces.has(callee.object.name) &&
    !isShadowedIdentifier(context, callee.object)
  ) {
    return RUN_IN_INJECTION_CONTEXT_NAMES.has(getPropertyName(callee.property) ?? "");
  }

  return false;
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
    const injectNames = new Set<string>();
    const injectorNames = new Set<string>();
    const runInInjectionContextNames = new Set<string>();
    const runInContextNames = new Set<string>();
    const angularNamespaces = new Set<string>();

    return {
      before() {
        injectNames.clear();
        injectorNames.clear();
        runInInjectionContextNames.clear();
        runInContextNames.clear();
        angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (importedName === "inject") injectNames.add(specifier.local.name);
            if (importedName === "Injector") injectorNames.add(specifier.local.name);
            if (importedName === "runInInjectionContext") {
              runInInjectionContextNames.add(specifier.local.name);
            }
            if (importedName === "runInContext") {
              runInContextNames.add(specifier.local.name);
            }
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            angularNamespaces.add(specifier.local.name);
          }
        }
      },

      CallExpression(node) {
        const callNode = node as AnyNode;
        const options = (context.options[0] ?? {}) as RuleOptions;
        const disallowInjectInjector =
          options.disallowInjectInjector ?? DEFAULT_DISALLOW_INJECT_INJECTOR;
        const disallowRunInInjectionContext =
          options.disallowRunInInjectionContext ?? DEFAULT_DISALLOW_RUN_IN_INJECTION_CONTEXT;

        if (
          disallowInjectInjector &&
          isDisallowedInjectInjector(
            context,
            callNode,
            injectNames,
            injectorNames,
            angularNamespaces,
          )
        ) {
          context.report({
            node: callNode.callee,
            messageId: "avoidInjectInjector",
          });
        }

        if (
          disallowRunInInjectionContext &&
          isDisallowedRunInInjectionContext(
            context,
            callNode,
            runInInjectionContextNames,
            runInContextNames,
            angularNamespaces,
          )
        ) {
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
