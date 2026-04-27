import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getDecoratorName, getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

interface RuleOptions {
  allowForGrouping?: boolean;
  allowForProviding?: boolean;
  allowForRouting?: boolean;
}

const DEFAULT_ALLOW_FOR_GROUPING = true;
const DEFAULT_ALLOW_FOR_PROVIDING = false;
const DEFAULT_ALLOW_FOR_ROUTING = false;

function getNgModuleMetadata(node: AnyNode): AnyNode | null {
  if (node.type !== "Decorator") return null;
  if (getDecoratorName(node) !== "NgModule") return null;

  const expression = node.expression;
  if (expression?.type !== "CallExpression") return null;
  const metadata = expression.arguments?.[0];
  return metadata?.type === "ObjectExpression" ? metadata : null;
}

function getArrayElementsFromProperty(metadata: AnyNode, propertyName: string): AnyNode[] {
  const property = (metadata.properties ?? []).find(
    (candidate: AnyNode) =>
      candidate.type === "Property" &&
      !candidate.computed &&
      getPropertyName(candidate.key) === propertyName &&
      candidate.value?.type === "ArrayExpression",
  ) as AnyNode | undefined;

  if (!property) return [];
  return (property.value.elements?.filter(Boolean) as AnyNode[]) ?? [];
}

function isMemberCall(node: AnyNode, methodName: string): boolean {
  return node.type === "CallExpression" && getPropertyName(node.callee?.property) === methodName;
}

function isRouterModuleForChild(node: AnyNode): boolean {
  return (
    isMemberCall(node, "forChild") &&
    node.callee?.type === "MemberExpression" &&
    getPropertyName(node.callee.object) === "RouterModule"
  );
}

function getNgModuleClassNode(decoratorNode: AnyNode): AnyNode | null {
  const parent = decoratorNode.parent as AnyNode | undefined;
  if (parent?.type === "ClassDeclaration" || parent?.type === "ClassExpression") {
    return parent;
  }
  return null;
}

function getStaticForRootMethod(classNode: AnyNode | null): AnyNode | null {
  if (!classNode?.body?.body) return null;
  return (
    classNode.body.body.find(
      (element: AnyNode) =>
        element.type === "MethodDefinition" &&
        !!element.static &&
        getPropertyName(element.key) === "forRoot",
    ) ?? null
  );
}

const avoidNgModules = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid NgModules in favor of standalone APIs and provider functions in modern Angular.",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowForGrouping: {
            type: "boolean",
            default: DEFAULT_ALLOW_FOR_GROUPING,
          },
          allowForProviding: {
            type: "boolean",
            default: DEFAULT_ALLOW_FOR_PROVIDING,
          },
          allowForRouting: {
            type: "boolean",
            default: DEFAULT_ALLOW_FOR_ROUTING,
          },
        },
      },
    ],
    messages: {
      avoidModuleImportsExports:
        "NgModule imports/exports are legacy composition. Prefer using standalone things directly.",
      avoidForRoot:
        "Avoid module.forRoot(...). Prefer provideX(...) functions to register injection providers.",
      avoidRouterForChild:
        "Avoid RouterModule.forChild(routes). Prefer provideRouter(...) and lazy route entries such as loadComponent: () => import('./components/auth/login-page').",
    },
  },

  createOnce(context: Context) {
    return {
      Decorator(node) {
        const options = (context.options[0] ?? {}) as RuleOptions;
        const allowForGrouping = options.allowForGrouping ?? DEFAULT_ALLOW_FOR_GROUPING;
        const allowForProviding = options.allowForProviding ?? DEFAULT_ALLOW_FOR_PROVIDING;
        const allowForRouting = options.allowForRouting ?? DEFAULT_ALLOW_FOR_ROUTING;

        const metadata = getNgModuleMetadata(node as AnyNode);
        if (!metadata) return;

        const importsElements = getArrayElementsFromProperty(metadata, "imports");
        const exportsElements = getArrayElementsFromProperty(metadata, "exports");

        if (!allowForGrouping && (importsElements.length > 0 || exportsElements.length > 0)) {
          context.report({
            node,
            messageId: "avoidModuleImportsExports",
          });
        }

        const importCalls = importsElements.filter((element) => element.type === "CallExpression");

        if (!allowForProviding) {
          for (const call of importCalls) {
            if (!isMemberCall(call, "forRoot")) continue;
            context.report({
              node: call,
              messageId: "avoidForRoot",
            });
          }

          const classNode = getNgModuleClassNode(node as AnyNode);
          const staticForRootMethod = getStaticForRootMethod(classNode);
          if (staticForRootMethod) {
            context.report({
              node: staticForRootMethod.key ?? staticForRootMethod,
              messageId: "avoidForRoot",
            });
          }
        }

        if (!allowForRouting) {
          for (const call of importCalls) {
            if (!isRouterModuleForChild(call)) continue;
            context.report({
              node: call,
              messageId: "avoidRouterForChild",
            });
          }
        }
      },
    };
  },
}) satisfies Rule;

export default avoidNgModules;
