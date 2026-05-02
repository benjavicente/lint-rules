import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, getTypeName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { addAngularCoreDecoratorImport, isAngularCoreDecorator } from "../../utilities/angular.js";
import type { AngularCoreDecoratorImports } from "../../utilities/angular.js";
import { findNearestBindingIdentifier, isShadowedIdentifier } from "../../utilities/scope.js";

const TARGET_DECORATORS = new Set(["Component", "Directive", "Injectable"]);
const FIELD_NODE_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);
const RXJS_SUBSCRIBABLE_NAMES = new Set([
  "AsyncSubject",
  "BehaviorSubject",
  "Observable",
  "ReplaySubject",
  "Subject",
]);
type TrackedReferences = Map<string, Set<AnyNode>>;

function hasTargetDecorator(
  context: Context,
  classNode: AnyNode | null | undefined,
  decoratorImports: AngularCoreDecoratorImports,
): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, decoratorImports),
  );
}

function hasSubscriptionTypeReference(
  context: Context,
  node: AnyNode | null | undefined,
  subscriptionLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): boolean {
  if (!node) return false;

  if (node.type === "TSTypeReference") {
    const typeName = getTypeName(node.typeName);
    if (
      node.typeName?.type === "Identifier" &&
      typeName &&
      subscriptionLocalNames.has(typeName) &&
      !isShadowedIdentifier(context, node.typeName)
    ) {
      return true;
    }
    if (typeName?.includes(".")) {
      const [namespaceName, memberName] = typeName.split(".");
      return memberName === "Subscription" && rxjsNamespaces.has(namespaceName);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;

    if (Array.isArray(value)) {
      if (
        value.some((child) =>
          hasSubscriptionTypeReference(
            context,
            child as AnyNode,
            subscriptionLocalNames,
            rxjsNamespaces,
          ),
        )
      ) {
        return true;
      }
      continue;
    }

    if (
      hasSubscriptionTypeReference(
        context,
        value as AnyNode,
        subscriptionLocalNames,
        rxjsNamespaces,
      )
    ) {
      return true;
    }
  }

  return false;
}

function isSubscriptionConstructor(
  context: Context,
  node: AnyNode | null | undefined,
  subscriptionLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (expression?.type !== "NewExpression") return false;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type === "Identifier") {
    return subscriptionLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee);
  }
  if (callee?.type !== "MemberExpression") return false;

  return (
    callee.object?.type === "Identifier" &&
    rxjsNamespaces.has(callee.object.name) &&
    !isShadowedIdentifier(context, callee.object) &&
    getPropertyName(callee.property) === "Subscription"
  );
}

function getReferenceName(node: AnyNode | null | undefined): string | null {
  const expression = unwrapExpression(node);
  if (!expression) return null;
  if (expression.type === "Identifier") return expression.name;
  if (expression.type !== "MemberExpression") return null;
  if (expression.object?.type !== "ThisExpression") return null;
  return getPropertyName(expression.property);
}

function isObservableReferenceName(name: string): boolean {
  return name.length > 1 && name.endsWith("$");
}

function addTrackedReference(
  references: TrackedReferences,
  name: string,
  binding: AnyNode | null | undefined,
): void {
  const bindings = references.get(name) ?? new Set<AnyNode>();
  if (binding) bindings.add(binding);
  references.set(name, bindings);
}

function hasTrackedReferenceName(references: TrackedReferences, name: string): boolean {
  return references.has(name);
}

function isTrackedReferenceExpression(
  context: Context,
  node: AnyNode | null | undefined,
  references: TrackedReferences,
): boolean {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  const referenceName = getReferenceName(expression);
  if (!referenceName) return false;

  const bindings = references.get(referenceName);
  if (!bindings) return false;

  if (expression.type === "MemberExpression" && expression.object?.type === "ThisExpression") {
    return true;
  }

  if (expression.type !== "Identifier") return false;

  const nearestBinding = findNearestBindingIdentifier(context, expression);
  return !!nearestBinding && bindings.has(nearestBinding);
}

function getDeclaredName(node: AnyNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "PrivateIdentifier") return node.name;
  return null;
}

function hasRxjsSubscribableTypeReference(
  context: Context,
  node: AnyNode | null | undefined,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): boolean {
  if (!node) return false;

  if (node.type === "TSTypeReference") {
    const typeName = getTypeName(node.typeName);
    if (
      node.typeName?.type === "Identifier" &&
      typeName &&
      rxjsSubscribableLocalNames.has(typeName) &&
      !isShadowedIdentifier(context, node.typeName)
    ) {
      return true;
    }
    if (typeName?.includes(".")) {
      const [namespaceName, memberName] = typeName.split(".");
      return RXJS_SUBSCRIBABLE_NAMES.has(memberName) && rxjsNamespaces.has(namespaceName);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;

    if (Array.isArray(value)) {
      if (
        value.some((child) =>
          hasRxjsSubscribableTypeReference(
            context,
            child as AnyNode,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ),
        )
      ) {
        return true;
      }
      continue;
    }

    if (
      hasRxjsSubscribableTypeReference(
        context,
        value as AnyNode,
        rxjsSubscribableLocalNames,
        rxjsNamespaces,
      )
    ) {
      return true;
    }
  }

  return false;
}

function isRxjsSubscribableConstructor(
  context: Context,
  node: AnyNode | null | undefined,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (expression?.type !== "NewExpression") return false;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type === "Identifier") {
    return rxjsSubscribableLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee);
  }
  if (callee?.type !== "MemberExpression") return false;

  return (
    callee.object?.type === "Identifier" &&
    rxjsNamespaces.has(callee.object.name) &&
    !isShadowedIdentifier(context, callee.object) &&
    RXJS_SUBSCRIBABLE_NAMES.has(getPropertyName(callee.property) ?? "")
  );
}

function isTakeUntilDestroyedCall(
  node: AnyNode | null | undefined,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): boolean {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return false;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type === "Identifier") return takeUntilDestroyedLocalNames.has(callee.name);
  if (callee?.type !== "MemberExpression") return false;

  return (
    callee.object?.type === "Identifier" &&
    interopNamespaces.has(callee.object.name) &&
    getPropertyName(callee.property) === "takeUntilDestroyed"
  );
}

function isTakeUntilDestroyedSubscribe(
  node: AnyNode,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): boolean {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return false;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return false;
  if (getPropertyName(callee.property) !== "subscribe") return false;

  const source = unwrapExpression(callee.object);
  if (source?.type !== "CallExpression") return false;

  const sourceCallee = unwrapExpression(source.callee);
  if (sourceCallee?.type !== "MemberExpression") return false;
  if (getPropertyName(sourceCallee.property) !== "pipe") return false;

  return (source.arguments ?? []).some((argument: AnyNode) =>
    isTakeUntilDestroyedCall(argument, takeUntilDestroyedLocalNames, interopNamespaces),
  );
}

function isKnownRxjsSubscribableExpression(
  context: Context,
  node: AnyNode | null | undefined,
  rxjsSubscribableReferences: TrackedReferences,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  const referenceName = getReferenceName(expression);
  if (referenceName && isObservableReferenceName(referenceName)) return true;
  if (isTrackedReferenceExpression(context, expression, rxjsSubscribableReferences)) return true;

  if (
    isRxjsSubscribableConstructor(context, expression, rxjsSubscribableLocalNames, rxjsNamespaces)
  ) {
    return true;
  }

  if (expression.type !== "CallExpression") return false;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type !== "MemberExpression") return false;

  const methodName = getPropertyName(callee.property);
  if (methodName !== "asObservable" && methodName !== "pipe") return false;

  return isKnownRxjsSubscribableExpression(
    context,
    callee.object,
    rxjsSubscribableReferences,
    rxjsSubscribableLocalNames,
    rxjsNamespaces,
  );
}

function isUnmanagedSubscribeCall(
  context: Context,
  node: AnyNode,
  rxjsSubscribableReferences: TrackedReferences,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): boolean {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return false;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return false;
  if (getPropertyName(callee.property) !== "subscribe") return false;

  return (
    isKnownRxjsSubscribableExpression(
      context,
      callee.object,
      rxjsSubscribableReferences,
      rxjsSubscribableLocalNames,
      rxjsNamespaces,
    ) && !isTakeUntilDestroyedSubscribe(node, takeUntilDestroyedLocalNames, interopNamespaces)
  );
}

function walkNode(
  node: AnyNode | AnyNode[] | null | undefined,
  containingClass: AnyNode,
  visitor: (node: AnyNode) => false | void,
): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const child of node) walkNode(child, containingClass, visitor);
    return;
  }

  if (
    node !== containingClass &&
    (node.type === "ClassDeclaration" || node.type === "ClassExpression")
  ) {
    return;
  }

  if (visitor(node) === false) return;

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    walkNode(value as AnyNode | AnyNode[], containingClass, visitor);
  }
}

function containsUnmanagedSubscribeCall(
  context: Context,
  node: AnyNode | null | undefined,
  containingClass: AnyNode,
  rxjsSubscribableReferences: TrackedReferences,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): boolean {
  let found = false;

  walkNode(node, containingClass, (current) => {
    if (
      isUnmanagedSubscribeCall(
        context,
        current,
        rxjsSubscribableReferences,
        rxjsSubscribableLocalNames,
        rxjsNamespaces,
        takeUntilDestroyedLocalNames,
        interopNamespaces,
      )
    ) {
      found = true;
      return false;
    }
    return undefined;
  });

  return found;
}

function collectRxjsSubscribableReferences(
  context: Context,
  classBody: AnyNode,
  classNode: AnyNode,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
): TrackedReferences {
  const references: TrackedReferences = new Map();
  let changed = true;

  while (changed) {
    changed = false;

    walkNode(classBody, classNode, (node) => {
      if (FIELD_NODE_TYPES.has(node.type)) {
        const name = getDeclaredName(node.key);
        if (!name || hasTrackedReferenceName(references, name)) return;

        if (
          isObservableReferenceName(name) ||
          hasRxjsSubscribableTypeReference(
            context,
            node.typeAnnotation?.typeAnnotation,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ) ||
          isRxjsSubscribableConstructor(
            context,
            node.value,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ) ||
          isKnownRxjsSubscribableExpression(
            context,
            node.value,
            references,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          )
        ) {
          addTrackedReference(references, name, node.key);
          changed = true;
        }
        return;
      }

      if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") {
        if (hasTrackedReferenceName(references, node.id.name)) return;

        if (
          isObservableReferenceName(node.id.name) ||
          hasRxjsSubscribableTypeReference(
            context,
            node.id.typeAnnotation?.typeAnnotation,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ) ||
          isRxjsSubscribableConstructor(
            context,
            node.init,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ) ||
          isKnownRxjsSubscribableExpression(
            context,
            node.init,
            references,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          )
        ) {
          addTrackedReference(references, node.id.name, node.id);
          changed = true;
        }
        return;
      }

      if (node.type === "AssignmentExpression") {
        const name = getReferenceName(node.left);
        if (!name || hasTrackedReferenceName(references, name)) return;

        if (
          isObservableReferenceName(name) ||
          isRxjsSubscribableConstructor(
            context,
            node.right,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          ) ||
          isKnownRxjsSubscribableExpression(
            context,
            node.right,
            references,
            rxjsSubscribableLocalNames,
            rxjsNamespaces,
          )
        ) {
          addTrackedReference(references, name, findNearestBindingIdentifier(context, node.left));
          changed = true;
        }
      }
    });
  }

  return references;
}

function collectSubscriptionReferences(
  context: Context,
  classBody: AnyNode,
  classNode: AnyNode,
  subscriptionLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
  rxjsSubscribableReferences: TrackedReferences,
  rxjsSubscribableLocalNames: Set<string>,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): TrackedReferences {
  const references: TrackedReferences = new Map();

  walkNode(classBody, classNode, (node) => {
    if (FIELD_NODE_TYPES.has(node.type)) {
      const name = getDeclaredName(node.key);
      if (!name) return;

      if (
        hasSubscriptionTypeReference(
          context,
          node.typeAnnotation?.typeAnnotation,
          subscriptionLocalNames,
          rxjsNamespaces,
        ) ||
        isSubscriptionConstructor(context, node.value, subscriptionLocalNames, rxjsNamespaces)
      ) {
        addTrackedReference(references, name, node.key);
      }
      return;
    }

    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") {
      if (
        hasSubscriptionTypeReference(
          context,
          node.id.typeAnnotation?.typeAnnotation,
          subscriptionLocalNames,
          rxjsNamespaces,
        ) ||
        isSubscriptionConstructor(context, node.init, subscriptionLocalNames, rxjsNamespaces) ||
        isUnmanagedSubscribeCall(
          context,
          node.init,
          rxjsSubscribableReferences,
          rxjsSubscribableLocalNames,
          rxjsNamespaces,
          takeUntilDestroyedLocalNames,
          interopNamespaces,
        )
      ) {
        addTrackedReference(references, node.id.name, node.id);
      }
      return;
    }

    if (node.type === "AssignmentExpression") {
      const name = getReferenceName(node.left);
      if (!name) return;

      if (
        isSubscriptionConstructor(context, node.right, subscriptionLocalNames, rxjsNamespaces) ||
        isUnmanagedSubscribeCall(
          context,
          node.right,
          rxjsSubscribableReferences,
          rxjsSubscribableLocalNames,
          rxjsNamespaces,
          takeUntilDestroyedLocalNames,
          interopNamespaces,
        )
      ) {
        addTrackedReference(references, name, findNearestBindingIdentifier(context, node.left));
      }
    }
  });

  return references;
}

function isSubscriptionAddCall(
  context: Context,
  node: AnyNode,
  containingClass: AnyNode,
  subscriptionReferences: TrackedReferences,
  rxjsSubscribableReferences: TrackedReferences,
  rxjsSubscribableLocalNames: Set<string>,
  rxjsNamespaces: Set<string>,
  takeUntilDestroyedLocalNames: Set<string>,
  interopNamespaces: Set<string>,
): boolean {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return false;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return false;
  if (getPropertyName(callee.property) !== "add") return false;

  if (isTrackedReferenceExpression(context, callee.object, subscriptionReferences)) return true;

  return (callNode.arguments ?? []).some(
    (argument: AnyNode) =>
      isTrackedReferenceExpression(context, argument, subscriptionReferences) ||
      containsUnmanagedSubscribeCall(
        context,
        argument,
        containingClass,
        rxjsSubscribableReferences,
        rxjsSubscribableLocalNames,
        rxjsNamespaces,
        takeUntilDestroyedLocalNames,
        interopNamespaces,
      ),
  );
}

function isSubscriptionUnsubscribeCall(
  context: Context,
  node: AnyNode,
  subscriptionReferences: TrackedReferences,
): boolean {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return false;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return false;
  if (getPropertyName(callee.property) !== "unsubscribe") return false;

  return isTrackedReferenceExpression(context, callee.object, subscriptionReferences);
}

const avoidExplicitSubscriptionManagement = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid manual RxJS Subscription lifecycle management in Angular components, directives, and services.",
      recommended: true,
    },
    schema: [],
    messages: {
      explicitSubscriptionType:
        "Avoid storing RxJS Subscription references in Angular classes. Prefer takeUntilDestroyed, toSignal, or firstValueFrom.",
      explicitSubscriptionConstructor:
        "Avoid creating RxJS Subscription instances in Angular classes. Prefer takeUntilDestroyed, toSignal, or firstValueFrom.",
      explicitSubscribe:
        "Avoid subscribe() calls that require manual lifecycle management. Prefer takeUntilDestroyed, toSignal, or firstValueFrom.",
      explicitSubscriptionAdd:
        "Avoid adding subscriptions to a Subscription container. Prefer takeUntilDestroyed, toSignal, or firstValueFrom.",
      explicitUnsubscribe:
        "Avoid manual unsubscribe() calls in Angular classes. Prefer takeUntilDestroyed, toSignal, or firstValueFrom.",
    },
  },

  createOnce(context: Context) {
    const subscriptionLocalNames = new Set<string>();
    const rxjsSubscribableLocalNames = new Set<string>();
    const rxjsNamespaces = new Set<string>();
    const takeUntilDestroyedLocalNames = new Set<string>();
    const interopNamespaces = new Set<string>();
    const decoratorImports: AngularCoreDecoratorImports = {
      decoratorNames: TARGET_DECORATORS,
      decoratorLocalNames: new Set<string>(),
      angularNamespaces: new Set<string>(),
    };

    return {
      before() {
        subscriptionLocalNames.clear();
        rxjsSubscribableLocalNames.clear();
        rxjsNamespaces.clear();
        takeUntilDestroyedLocalNames.clear();
        interopNamespaces.clear();
        decoratorImports.decoratorLocalNames.clear();
        decoratorImports.angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        const source = node.source?.value;

        if (source === "@angular/core") {
          for (const specifier of node.specifiers ?? []) {
            addAngularCoreDecoratorImport(
              specifier as AnyNode,
              TARGET_DECORATORS,
              decoratorImports,
            );
          }
        }

        if (source === "rxjs") {
          for (const specifier of node.specifiers ?? []) {
            if (specifier.type === "ImportSpecifier") {
              const importedName = getPropertyName(specifier.imported as AnyNode);
              if (importedName === "Subscription") subscriptionLocalNames.add(specifier.local.name);
              if (RXJS_SUBSCRIBABLE_NAMES.has(importedName ?? "")) {
                rxjsSubscribableLocalNames.add(specifier.local.name);
              }
              continue;
            }

            if (specifier.type === "ImportNamespaceSpecifier") {
              rxjsNamespaces.add(specifier.local.name);
            }
          }
        }

        if (source === "@angular/core/rxjs-interop") {
          for (const specifier of node.specifiers ?? []) {
            if (specifier.type === "ImportSpecifier") {
              const importedName = getPropertyName(specifier.imported as AnyNode);
              if (importedName === "takeUntilDestroyed") {
                takeUntilDestroyedLocalNames.add(specifier.local.name);
              }
              continue;
            }

            if (specifier.type === "ImportNamespaceSpecifier") {
              interopNamespaces.add(specifier.local.name);
            }
          }
        }
      },

      ClassBody(node) {
        const classBody = node as AnyNode;
        const classNode = classBody.parent as AnyNode | undefined;
        if (!classNode || !hasTargetDecorator(context, classNode, decoratorImports)) return;

        const rxjsSubscribableReferences = collectRxjsSubscribableReferences(
          context,
          classBody,
          classNode,
          rxjsSubscribableLocalNames,
          rxjsNamespaces,
        );
        const subscriptionReferences = collectSubscriptionReferences(
          context,
          classBody,
          classNode,
          subscriptionLocalNames,
          rxjsNamespaces,
          rxjsSubscribableReferences,
          rxjsSubscribableLocalNames,
          takeUntilDestroyedLocalNames,
          interopNamespaces,
        );

        walkNode(classBody, classNode, (current) => {
          if (FIELD_NODE_TYPES.has(current.type)) {
            if (
              hasSubscriptionTypeReference(
                context,
                current.typeAnnotation?.typeAnnotation,
                subscriptionLocalNames,
                rxjsNamespaces,
              )
            ) {
              context.report({
                node: current.key ?? current,
                messageId: "explicitSubscriptionType",
              });
            }
            return;
          }

          if (
            current.type === "VariableDeclarator" &&
            current.id?.type === "Identifier" &&
            hasSubscriptionTypeReference(
              context,
              current.id.typeAnnotation?.typeAnnotation,
              subscriptionLocalNames,
              rxjsNamespaces,
            )
          ) {
            context.report({
              node: current.id,
              messageId: "explicitSubscriptionType",
            });
            return;
          }

          if (isSubscriptionConstructor(context, current, subscriptionLocalNames, rxjsNamespaces)) {
            context.report({
              node: current,
              messageId: "explicitSubscriptionConstructor",
            });
            return false;
          }

          if (
            isSubscriptionAddCall(
              context,
              current,
              classNode,
              subscriptionReferences,
              rxjsSubscribableReferences,
              rxjsSubscribableLocalNames,
              rxjsNamespaces,
              takeUntilDestroyedLocalNames,
              interopNamespaces,
            )
          ) {
            context.report({
              node: current,
              messageId: "explicitSubscriptionAdd",
            });
            return false;
          }

          if (isSubscriptionUnsubscribeCall(context, current, subscriptionReferences)) {
            context.report({
              node: current,
              messageId: "explicitUnsubscribe",
            });
            return false;
          }

          if (
            isUnmanagedSubscribeCall(
              context,
              current,
              rxjsSubscribableReferences,
              rxjsSubscribableLocalNames,
              rxjsNamespaces,
              takeUntilDestroyedLocalNames,
              interopNamespaces,
            )
          ) {
            context.report({
              node: current,
              messageId: "explicitSubscribe",
            });
            return false;
          }

          return undefined;
        });
      },
    };
  },
}) satisfies Rule;

export default avoidExplicitSubscriptionManagement;
