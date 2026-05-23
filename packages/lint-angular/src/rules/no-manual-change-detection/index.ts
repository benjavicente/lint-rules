import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import {
  isImportedNamespaceMember,
  isImportedReference,
  isNamespaceImport,
} from "../../utilities/angular.js";
import { findNearestBindingIdentifier } from "../../utilities/scope.js";

const ANGULAR_CORE_SOURCE = "@angular/core";
const CHANGE_DETECTOR_REF_NAMES = new Set(["ChangeDetectorRef"]);
const INJECT_NAMES = new Set(["inject"]);
const MANUAL_CHANGE_DETECTION_METHODS = new Set([
  "checkNoChanges",
  "detach",
  "detectChanges",
  "markForCheck",
  "reattach",
]);
const FIELD_NODE_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);

interface ChangeDetectorRefBindings {
  fields: Set<string>;
  parameters: Set<AnyNode>;
}

function isChangeDetectorRefReference(context: Context, node: AnyNode | null | undefined): boolean {
  return (
    isImportedReference(context, node, ANGULAR_CORE_SOURCE, CHANGE_DETECTOR_REF_NAMES) ||
    isImportedNamespaceMember(context, node, ANGULAR_CORE_SOURCE, CHANGE_DETECTOR_REF_NAMES)
  );
}

function isInjectCall(context: Context, node: AnyNode | null | undefined): boolean {
  const expression = unwrapExpression(node);
  if (expression?.type !== "CallExpression") return false;

  return (
    isImportedReference(context, expression.callee, ANGULAR_CORE_SOURCE, INJECT_NAMES) &&
    isChangeDetectorRefReference(context, expression.arguments?.[0])
  );
}

function isChangeDetectorRefType(context: Context, node: AnyNode | null | undefined): boolean {
  if (!node) return false;

  if (node.type === "TSTypeReference") {
    if (isChangeDetectorRefReference(context, node.typeName)) return true;

    if (node.typeName?.type === "TSQualifiedName" && node.typeName.left?.type === "Identifier") {
      return (
        isNamespaceImport(context, node.typeName.left, ANGULAR_CORE_SOURCE) &&
        getPropertyName(node.typeName.right) === "ChangeDetectorRef"
      );
    }
  }

  return false;
}

function getMemberName(node: AnyNode | null | undefined): string | null {
  const expression = unwrapExpression(node);
  if (!expression) return null;
  if (expression.type === "Identifier") return expression.name;
  if (expression.type === "PrivateIdentifier") return expression.name;
  return null;
}

function getParameterName(node: AnyNode | null | undefined): string | null {
  const parameter = node?.type === "TSParameterProperty" ? node.parameter : node;
  if (parameter?.type === "Identifier") return parameter.name;
  if (parameter?.type === "AssignmentPattern" && parameter.left?.type === "Identifier") {
    return parameter.left.name;
  }
  return null;
}

function getParameterType(node: AnyNode | null | undefined): AnyNode | null {
  const parameter = node?.type === "TSParameterProperty" ? node.parameter : node;
  if (parameter?.type === "AssignmentPattern") {
    return parameter.left?.typeAnnotation?.typeAnnotation ?? null;
  }
  return parameter?.typeAnnotation?.typeAnnotation ?? null;
}

function getParameterBinding(node: AnyNode | null | undefined): AnyNode | null {
  const parameter = node?.type === "TSParameterProperty" ? node.parameter : node;
  if (parameter?.type === "Identifier") return parameter;
  if (parameter?.type === "AssignmentPattern" && parameter.left?.type === "Identifier") {
    return parameter.left;
  }
  return null;
}

function collectChangeDetectorRefBindings(
  context: Context,
  classNode: AnyNode,
): ChangeDetectorRefBindings {
  const fields = new Set<string>();
  const parameters = new Set<AnyNode>();

  for (const member of classNode.body?.body ?? []) {
    if (member.type === "MethodDefinition" && getPropertyName(member.key) === "constructor") {
      for (const parameter of member.value?.params ?? []) {
        const name = getParameterName(parameter);
        if (name && isChangeDetectorRefType(context, getParameterType(parameter))) {
          const binding = getParameterBinding(parameter);
          if (binding) parameters.add(binding);
          if (parameter.type === "TSParameterProperty") fields.add(name);
        }
      }
    }

    if (!FIELD_NODE_TYPES.has(member.type)) continue;

    const name = getMemberName(member.key);
    if (!name) continue;

    const typeNode = member.typeAnnotation?.typeAnnotation;
    if (isChangeDetectorRefType(context, typeNode) || isInjectCall(context, member.value)) {
      fields.add(name);
    }
  }

  return { fields, parameters };
}

function getManualChangeDetectionCall(
  context: Context,
  callNode: AnyNode,
  bindings: ChangeDetectorRefBindings,
): {
  methodName: string;
  node: AnyNode;
} | null {
  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return null;

  const methodName = getPropertyName(callee.property);
  if (!methodName || !MANUAL_CHANGE_DETECTION_METHODS.has(methodName)) return null;

  const object = unwrapExpression(callee.object);
  if (object?.type === "Identifier") {
    const binding = findNearestBindingIdentifier(context, object);
    return binding && bindings.parameters.has(binding)
      ? { methodName, node: callee.property ?? callee }
      : null;
  }

  if (object?.type !== "MemberExpression") return null;
  if (object.object?.type !== "ThisExpression") return null;

  const fieldName = getPropertyName(object.property);
  return fieldName && bindings.fields.has(fieldName)
    ? { methodName, node: callee.property ?? callee }
    : null;
}

function walkNode(node: AnyNode | AnyNode[] | null | undefined, visitor: (node: AnyNode) => void) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const child of node) walkNode(child, visitor);
    return;
  }

  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    walkNode(value as AnyNode | AnyNode[], visitor);
  }
}

const noManualChangeDetection = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow manual Angular change detection through ChangeDetectorRef APIs.",
      recommended: true,
    },
    schema: [],
    messages: {
      noManualChangeDetection:
        "Avoid manual change detection with ChangeDetectorRef. Prefer Angular's normal change detection triggers, signals, async bindings, or input updates.",
    },
  },

  createOnce(context: Context) {
    return {
      ClassDeclaration(node) {
        const classNode = node as AnyNode;
        const changeDetectorRefBindings = collectChangeDetectorRefBindings(context, classNode);
        if (
          changeDetectorRefBindings.fields.size === 0 &&
          changeDetectorRefBindings.parameters.size === 0
        ) {
          return;
        }

        walkNode(classNode.body, (child) => {
          if (child.type !== "CallExpression") return;

          const manualCall = getManualChangeDetectionCall(
            context,
            child,
            changeDetectorRefBindings,
          );
          if (!manualCall) return;

          context.report({
            node: manualCall.node,
            messageId: "noManualChangeDetection",
          });
        });
      },
    };
  },
}) satisfies Rule;

export default noManualChangeDetection;
