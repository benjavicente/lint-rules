import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, getTypeName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { addAngularCoreDecoratorImport, isAngularCoreDecorator } from "../../utilities/angular.js";
import type { AngularCoreDecoratorImports } from "../../utilities/angular.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

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

function getImportedSubjectKind(
  localName: string,
  subjectLocalNames: Map<string, SubjectKind>,
): SubjectKind | null {
  return subjectLocalNames.get(localName) ?? null;
}

function getSubjectKindFromType(
  context: Context,
  node: AnyNode | null | undefined,
  subjectLocalNames: Map<string, SubjectKind>,
  rxjsNamespaces: Set<string>,
): SubjectKind | null {
  if (!node) return null;
  if (node.type !== "TSTypeReference") return null;

  const typeName = getTypeName(node.typeName);
  if (!typeName) return null;

  const localKind = getImportedSubjectKind(typeName, subjectLocalNames);
  if (
    localKind &&
    node.typeName?.type === "Identifier" &&
    !isShadowedIdentifier(context, node.typeName)
  ) {
    return localKind;
  }

  if (!typeName.includes(".")) return null;
  const [namespaceName, memberName] = typeName.split(".");
  if (!rxjsNamespaces.has(namespaceName)) return null;
  if (
    node.typeName?.type === "TSQualifiedName" &&
    node.typeName.left?.type === "Identifier" &&
    isShadowedIdentifier(context, node.typeName.left)
  ) {
    return null;
  }
  return SUBJECT_NAMES.has(memberName as SubjectKind) ? (memberName as SubjectKind) : null;
}

function getSubjectKindFromConstructor(
  context: Context,
  node: AnyNode | null | undefined,
  subjectLocalNames: Map<string, SubjectKind>,
  rxjsNamespaces: Set<string>,
): SubjectKind | null {
  const expression = unwrapExpression(node);
  if (expression?.type !== "NewExpression") return null;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type === "Identifier") {
    if (isShadowedIdentifier(context, callee)) return null;
    return getImportedSubjectKind(callee.name, subjectLocalNames);
  }

  if (callee?.type !== "MemberExpression") return null;
  if (callee.object?.type !== "Identifier" || !rxjsNamespaces.has(callee.object.name)) return null;
  if (isShadowedIdentifier(context, callee.object)) return null;

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

function collectSubjectFields(
  context: Context,
  classBody: AnyNode,
  subjectLocalNames: Map<string, SubjectKind>,
  rxjsNamespaces: Set<string>,
): Map<string, SubjectField> {
  const fields = new Map<string, SubjectField>();

  for (const member of classBody.body ?? []) {
    if (!FIELD_NODE_TYPES.has(member.type)) continue;

    const fieldName = getMemberName(member.key);
    if (!fieldName) continue;

    const typeNode = member.typeAnnotation?.typeAnnotation;
    const kind =
      getSubjectKindFromConstructor(context, member.value, subjectLocalNames, rxjsNamespaces) ??
      getSubjectKindFromType(context, typeNode, subjectLocalNames, rxjsNamespaces);

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
    const subjectLocalNames = new Map<string, SubjectKind>();
    const rxjsNamespaces = new Set<string>();
    const decoratorImports: AngularCoreDecoratorImports = {
      decoratorNames: TARGET_DECORATORS,
      decoratorLocalNames: new Set<string>(),
      angularNamespaces: new Set<string>(),
    };

    return {
      before() {
        subjectLocalNames.clear();
        rxjsNamespaces.clear();
        decoratorImports.decoratorLocalNames.clear();
        decoratorImports.angularNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value === "@angular/core") {
          for (const specifier of node.specifiers ?? []) {
            addAngularCoreDecoratorImport(
              specifier as AnyNode,
              TARGET_DECORATORS,
              decoratorImports,
            );
          }
          return;
        }

        if (node.source?.value !== "rxjs") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (SUBJECT_NAMES.has(importedName as SubjectKind)) {
              subjectLocalNames.set(specifier.local.name, importedName as SubjectKind);
            }
            continue;
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            rxjsNamespaces.add(specifier.local.name);
          }
        }
      },

      ClassBody(node) {
        const classBody = node as AnyNode;
        const classNode = classBody.parent as AnyNode | undefined;
        if (!hasTargetDecorator(context, classNode, decoratorImports)) return;

        const fields = collectSubjectFields(context, classBody, subjectLocalNames, rxjsNamespaces);
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
