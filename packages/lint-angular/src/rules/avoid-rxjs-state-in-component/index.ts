import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import {
  getImportedName,
  isAngularCoreDecorator,
  isNamespaceImport,
} from "../../utilities/angular.js";

type SubjectKind = "BehaviorSubject" | "ReplaySubject" | "Subject";

interface SubjectField {
  key: AnyNode;
  kind: SubjectKind;
}

interface FieldUsage {
  hasAsObservable: boolean;
  hasNextWithValue: boolean;
  hasNgOnDestroyComplete: boolean;
  hasNgOnDestroyNext: boolean;
}

const TARGET_DECORATORS = new Set(["Component", "Directive"]);
const SUBJECT_NAMES = new Set<SubjectKind>(["BehaviorSubject", "ReplaySubject", "Subject"]);
const FIELD_NODE_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);
function hasTargetDecorator(context: Context, classNode: AnyNode | null | undefined): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, TARGET_DECORATORS),
  );
}

function getImportedSubjectKind(context: Context, node: AnyNode | null | undefined) {
  const importedName = getImportedName(context, node, "rxjs");
  return SUBJECT_NAMES.has(importedName as SubjectKind) ? (importedName as SubjectKind) : null;
}

function getSubjectKindFromType(
  context: Context,
  node: AnyNode | null | undefined,
): SubjectKind | null {
  if (!node) return null;
  if (node.type !== "TSTypeReference") return null;

  if (node.typeName?.type === "Identifier") {
    return getImportedSubjectKind(context, node.typeName);
  }

  if (node.typeName?.type === "TSQualifiedName" && node.typeName.left?.type === "Identifier") {
    const memberName = getPropertyName(node.typeName.right);
    return isNamespaceImport(context, node.typeName.left, "rxjs") &&
      SUBJECT_NAMES.has(memberName as SubjectKind)
      ? (memberName as SubjectKind)
      : null;
  }

  return null;
}

function getSubjectKindFromConstructor(
  context: Context,
  node: AnyNode | null | undefined,
): SubjectKind | null {
  const expression = unwrapExpression(node);
  if (expression?.type !== "NewExpression") return null;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type === "Identifier") {
    return getImportedSubjectKind(context, callee);
  }

  if (callee?.type !== "MemberExpression") return null;
  if (callee.object?.type !== "Identifier" || !isNamespaceImport(context, callee.object, "rxjs")) {
    return null;
  }

  const memberName = getPropertyName(callee.property);
  return SUBJECT_NAMES.has(memberName as SubjectKind) ? (memberName as SubjectKind) : null;
}

function getMemberName(node: AnyNode | null | undefined): string | null {
  const expression = unwrapExpression(node);
  if (!expression) return null;
  if (expression.type === "Identifier") return expression.name;
  if (expression.type === "PrivateIdentifier") return expression.name;
  return null;
}

function getThisFieldName(node: AnyNode | null | undefined): string | null {
  const expression = unwrapExpression(node);
  if (expression?.type !== "MemberExpression") return null;
  if (expression.object?.type !== "ThisExpression") return null;
  return getPropertyName(expression.property);
}

function isCallOnThisField(
  node: AnyNode,
  fields: Map<string, SubjectField>,
): {
  fieldName: string;
  methodName: string;
  argumentCount: number;
} | null {
  const callNode = unwrapExpression(node);
  if (callNode?.type !== "CallExpression") return null;

  const callee = unwrapExpression(callNode.callee);
  if (callee?.type !== "MemberExpression") return null;

  const fieldName = getThisFieldName(callee.object);
  const methodName = getPropertyName(callee.property);
  if (!fieldName || !methodName || !fields.has(fieldName)) return null;

  return {
    fieldName,
    methodName,
    argumentCount: callNode.arguments?.length ?? 0,
  };
}

function isNgOnDestroyMethod(member: AnyNode): boolean {
  return (
    member.type === "MethodDefinition" &&
    getPropertyName(member.key) === "ngOnDestroy" &&
    !!member.value
  );
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

function getUsage(usages: Map<string, FieldUsage>, fieldName: string): FieldUsage {
  const existing = usages.get(fieldName);
  if (existing) return existing;

  const next = {
    hasAsObservable: false,
    hasNextWithValue: false,
    hasNgOnDestroyComplete: false,
    hasNgOnDestroyNext: false,
  };
  usages.set(fieldName, next);
  return next;
}

function collectSubjectFields(context: Context, classBody: AnyNode): Map<string, SubjectField> {
  const fields = new Map<string, SubjectField>();

  for (const member of classBody.body ?? []) {
    if (!FIELD_NODE_TYPES.has(member.type)) continue;

    const fieldName = getMemberName(member.key);
    if (!fieldName) continue;

    const typeNode = member.typeAnnotation?.typeAnnotation;
    const kind =
      getSubjectKindFromConstructor(context, member.value) ??
      getSubjectKindFromType(context, typeNode);

    if (!kind) continue;

    fields.set(fieldName, {
      key: member.key ?? member,
      kind,
    });
  }

  return fields;
}

function collectFieldUsages(classBody: AnyNode, fields: Map<string, SubjectField>) {
  const usages = new Map<string, FieldUsage>();
  const ngOnDestroyMethods = new Set<AnyNode>();

  for (const member of classBody.body ?? []) {
    if (isNgOnDestroyMethod(member)) ngOnDestroyMethods.add(member.value);
  }

  walkNode(classBody, (node) => {
    const call = isCallOnThisField(node, fields);
    if (!call) return;

    const usage = getUsage(usages, call.fieldName);
    if (call.methodName === "asObservable") {
      usage.hasAsObservable = true;
    }
    if (call.methodName === "next" && call.argumentCount > 0) {
      usage.hasNextWithValue = true;
    }

    const isInsideNgOnDestroy = ngOnDestroyMethods.has(node.parent) || ngOnDestroyMethods.has(node);
    let current = node.parent as AnyNode | undefined;
    while (!isInsideNgOnDestroy && current) {
      if (ngOnDestroyMethods.has(current)) break;
      current = current.parent as AnyNode | undefined;
    }

    if (!current && !ngOnDestroyMethods.has(node.parent) && !ngOnDestroyMethods.has(node)) {
      return;
    }

    if (call.methodName === "next") {
      usage.hasNgOnDestroyNext = true;
    }
    if (call.methodName === "complete") {
      usage.hasNgOnDestroyComplete = true;
    }
  });

  return usages;
}

function isDestroySubjectUsage(usage: FieldUsage | undefined): boolean {
  return !!usage?.hasNgOnDestroyNext && !!usage.hasNgOnDestroyComplete;
}

const avoidRxjsStateInComponent = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid using RxJS Subject classes for component or directive state and destruction lifecycle.",
      recommended: true,
    },
    schema: [],
    messages: {
      avoidRxjsState:
        "Avoid using RxJS {{kind}} for component/directive state. Prefer signal(), computed(), or linkedSignal().",
      avoidDestroySubject:
        "Avoid destroy Subject lifecycle management. Prefer takeUntilDestroyed() from @angular/core/rxjs-interop.",
    },
  },

  createOnce(context) {
    return {
      ClassBody(node) {
        const classBody = node as AnyNode;
        const classNode = classBody.parent as AnyNode | undefined;
        if (!hasTargetDecorator(context, classNode)) return;

        const fields = collectSubjectFields(context, classBody);
        const usages = collectFieldUsages(classBody, fields);

        for (const [fieldName, field] of fields) {
          const usage = usages.get(fieldName);

          if (field.kind === "Subject" && isDestroySubjectUsage(usage)) {
            context.report({
              node: field.key,
              messageId: "avoidDestroySubject",
            });
            continue;
          }

          context.report({
            node: field.key,
            messageId: "avoidRxjsState",
            data: { kind: field.kind },
          });
        }
      },
    };
  },
}) satisfies Rule;

export default avoidRxjsStateInComponent;
