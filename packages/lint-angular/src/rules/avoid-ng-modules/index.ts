import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

interface RuleOptions {
  allowForGrouping?: boolean;
  allowForProviding?: boolean;
  allowForRouting?: boolean;
}

interface ImportBinding {
  source: string;
  importedName: string;
}

const DEFAULT_ALLOW_FOR_GROUPING = true;
const DEFAULT_ALLOW_FOR_PROVIDING = false;
const DEFAULT_ALLOW_FOR_ROUTING = false;

function isNgModuleDecorator(
  context: Context,
  node: AnyNode,
  importBindings: Map<string, ImportBinding>,
  namespaceImportBindings: Map<string, string>,
): boolean {
  if (node.type !== "Decorator") return false;

  const expression = node.expression ?? node;
  const callee = expression?.type === "CallExpression" ? expression.callee : expression;

  if (callee?.type === "Identifier") {
    const binding = importBindings.get(callee.name);
    return (
      !!binding &&
      binding.source === "@angular/core" &&
      binding.importedName === "NgModule" &&
      !isShadowedIdentifier(context, callee)
    );
  }

  return (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "Identifier" &&
    namespaceImportBindings.get(callee.object.name) === "@angular/core" &&
    !isShadowedIdentifier(context, callee.object) &&
    getPropertyName(callee.property) === "NgModule"
  );
}

function getNgModuleMetadata(
  context: Context,
  node: AnyNode,
  importBindings: Map<string, ImportBinding>,
  namespaceImportBindings: Map<string, string>,
): AnyNode | null {
  if (!isNgModuleDecorator(context, node, importBindings, namespaceImportBindings)) return null;
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

function isModuleCallFromImport(
  node: AnyNode,
  expectedSource: string,
  expectedModuleName: string,
  importBindings: Map<string, ImportBinding>,
  namespaceImportBindings: Map<string, string>,
): boolean {
  if (node.type !== "CallExpression") return false;
  const callee = node.callee;
  if (callee?.type !== "MemberExpression") return false;
  const moduleRef = callee.object;

  if (moduleRef?.type === "Identifier") {
    const binding = importBindings.get(moduleRef.name);
    return (
      !!binding && binding.source === expectedSource && binding.importedName === expectedModuleName
    );
  }

  if (moduleRef?.type !== "MemberExpression") return false;
  if (moduleRef.object?.type !== "Identifier") return false;

  const namespaceSource = namespaceImportBindings.get(moduleRef.object.name);
  if (namespaceSource !== expectedSource) return false;
  return getPropertyName(moduleRef.property) === expectedModuleName;
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
      avoidRouterForRoot:
        "Avoid RouterModule.forRoot(routes). Prefer provideRouter(routes). See https://angular.dev/guide/routing/define-routes",
      avoidRouterForChild:
        "Avoid RouterModule.forChild(routes). Prefer provideRouter(...) and lazy route entries such as loadComponent: () => import('./components/auth/login-page').",
      avoidNgrxStoreForRoot:
        "Avoid StoreModule.forRoot(...). Prefer provideStore(...) with standalone providers. See https://ngrx.io/guide/store",
      avoidNgrxEffectsForRoot:
        "Avoid EffectsModule.forRoot(...). Prefer provideEffects(...) with standalone providers. See https://ngrx.io/guide/effects",
      avoidNgrxStoreForFeature:
        "Avoid StoreModule.forFeature(...). Prefer provideState(...) with standalone providers. See https://ngrx.io/guide/store",
      avoidNgrxEffectsForFeature:
        "Avoid EffectsModule.forFeature(...). Prefer provideEffects(...) scoped to feature providers. See https://ngrx.io/guide/effects",
      avoidNgrxStoreDevtoolsInstrument:
        "Avoid StoreDevtoolsModule.instrument(...). Prefer provideStoreDevtools(...) with standalone providers. See https://ngrx.io/guide/store-devtools",
      avoidNgrxRouterStoreForRoot:
        "Avoid StoreRouterConnectingModule.forRoot(...). Prefer provideRouterStore(...) with standalone providers. See https://ngrx.io/guide/router-store",
    },
  },

  createOnce(context: Context) {
    const importBindings = new Map<string, ImportBinding>();
    const namespaceImportBindings = new Map<string, string>();

    return {
      before() {
        importBindings.clear();
        namespaceImportBindings.clear();
      },

      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (!importedName) continue;
            importBindings.set(specifier.local.name, { source, importedName });
            continue;
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            namespaceImportBindings.set(specifier.local.name, source);
          }
        }
      },

      Decorator(node) {
        const options = (context.options[0] ?? {}) as RuleOptions;
        const allowForGrouping = options.allowForGrouping ?? DEFAULT_ALLOW_FOR_GROUPING;
        const allowForProviding = options.allowForProviding ?? DEFAULT_ALLOW_FOR_PROVIDING;
        const allowForRouting = options.allowForRouting ?? DEFAULT_ALLOW_FOR_ROUTING;

        const metadata = getNgModuleMetadata(
          context,
          node as AnyNode,
          importBindings,
          namespaceImportBindings,
        );
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
            const methodName = getPropertyName(call.callee?.property);

            if (
              methodName === "forRoot" &&
              isModuleCallFromImport(
                call,
                "@angular/router",
                "RouterModule",
                importBindings,
                namespaceImportBindings,
              ) &&
              !allowForRouting
            ) {
              context.report({
                node: call,
                messageId: "avoidRouterForRoot",
              });
              continue;
            }

            if (
              methodName === "forRoot" &&
              isModuleCallFromImport(
                call,
                "@ngrx/store",
                "StoreModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxStoreForRoot",
              });
              continue;
            }

            if (
              methodName === "forRoot" &&
              isModuleCallFromImport(
                call,
                "@ngrx/effects",
                "EffectsModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxEffectsForRoot",
              });
              continue;
            }

            if (
              methodName === "forFeature" &&
              isModuleCallFromImport(
                call,
                "@ngrx/store",
                "StoreModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxStoreForFeature",
              });
              continue;
            }

            if (
              methodName === "forFeature" &&
              isModuleCallFromImport(
                call,
                "@ngrx/effects",
                "EffectsModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxEffectsForFeature",
              });
              continue;
            }

            if (
              methodName === "instrument" &&
              isModuleCallFromImport(
                call,
                "@ngrx/store-devtools",
                "StoreDevtoolsModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxStoreDevtoolsInstrument",
              });
              continue;
            }

            if (
              methodName === "forRoot" &&
              isModuleCallFromImport(
                call,
                "@ngrx/router-store",
                "StoreRouterConnectingModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              context.report({
                node: call,
                messageId: "avoidNgrxRouterStoreForRoot",
              });
              continue;
            }

            if (
              methodName === "forRoot" &&
              isModuleCallFromImport(
                call,
                "@angular/router",
                "RouterModule",
                importBindings,
                namespaceImportBindings,
              ) &&
              allowForRouting
            ) {
              continue;
            }

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
            if (!isMemberCall(call, "forChild")) continue;
            if (
              !isModuleCallFromImport(
                call,
                "@angular/router",
                "RouterModule",
                importBindings,
                namespaceImportBindings,
              )
            ) {
              continue;
            }
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
