import { defineRule } from "@oxlint/plugins";
import type { Context, Fix, Fixer, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import {
  isAngularCoreDecorator,
  isImportedNamespaceMember,
  isImportedReference,
} from "../../utilities/angular.js";

const TARGET_DECORATORS = new Set(["Component", "Directive"]);
const INPUT_MODEL_APIS = new Set(["input", "model"]);
const OUTPUT_APIS = new Set(["output", "outputFromObservable"]);
const INJECT_APIS = new Set(["inject"]);
const FIELD_NODE_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);

function hasTargetDecorator(context: Context, classNode: AnyNode | null | undefined): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, TARGET_DECORATORS),
  );
}

function isApiCallFromAngularCore(
  context: Context,
  node: AnyNode | null | undefined,
  apiNames: Set<string>,
): boolean {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee;

  if (isImportedReference(context, callee, "@angular/core", apiNames)) return true;

  if (callee?.type !== "MemberExpression") return false;

  const supportsRequiredApi = [...INPUT_MODEL_APIS].some((name) => apiNames.has(name));

  // Handles input.required(...) and alias.required(...)
  if (getPropertyName(callee.property) === "required" && callee.object?.type === "Identifier") {
    return (
      supportsRequiredApi && isImportedReference(context, callee.object, "@angular/core", apiNames)
    );
  }

  // Handles ng.input(...) and ng.output(...)
  if (isImportedNamespaceMember(context, callee, "@angular/core", apiNames)) return true;

  // Handles ng.input.required(...) / ng.model.required(...)
  if (
    getPropertyName(callee.property) === "required" &&
    callee.object?.type === "MemberExpression" &&
    callee.object.object?.type === "Identifier"
  ) {
    const namespaceApiName = getPropertyName(callee.object.property);
    return (
      supportsRequiredApi &&
      !!namespaceApiName &&
      apiNames.has(namespaceApiName) &&
      isImportedNamespaceMember(context, callee.object, "@angular/core", apiNames)
    );
  }

  return false;
}

function isNonPublicMember(memberNode: AnyNode): boolean {
  if (memberNode.key?.type === "PrivateIdentifier") return true;
  return memberNode.accessibility === "private" || memberNode.accessibility === "protected";
}

function isPublicMember(memberNode: AnyNode): boolean {
  if (memberNode.key?.type === "PrivateIdentifier") return false;
  return memberNode.accessibility !== "private" && memberNode.accessibility !== "protected";
}

function getAccessibilityModifierRange(
  context: Context,
  memberNode: AnyNode,
): [number, number] | null {
  const memberRange = getRange(memberNode);
  const keyRange = getRange(memberNode.key);
  if (!memberRange || !keyRange) return null;

  const prefixText = context.sourceCode.text.slice(memberRange[0], keyRange[0]);
  const match = /\b(private|protected|public)\b/u.exec(prefixText);
  if (!match) return null;

  return [memberRange[0] + match.index, memberRange[0] + match.index + match[0].length];
}

function getVisibilityFix(
  context: Context,
  memberNode: AnyNode,
  targetVisibility: "public" | "protected",
): ((fixer: Fixer) => Fix) | undefined {
  if (memberNode.key?.type === "PrivateIdentifier") return undefined;
  const keyRange = getRange(memberNode.key);
  if (!keyRange) return undefined;

  const accessibilityRange = getAccessibilityModifierRange(context, memberNode);
  if (accessibilityRange) {
    return (fixer) => fixer.replaceTextRange(accessibilityRange, targetVisibility);
  }

  return (fixer) => fixer.insertTextBeforeRange([keyRange[0], keyRange[0]], `${targetVisibility} `);
}

const publicComponentInterface = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require component/directive signal interface members (input/model/output APIs) to be public, and it's dependencies to be non-public.",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      nonPublicInputModel:
        "Input/model member {{name}} must be public so the component/directive interface is externally accessible.",
      nonPublicOutput:
        "Output member {{name}} must be public so the component/directive interface is externally accessible.",
      publicInjectMember:
        "Injected member {{name}} should not be public; prefer protected (template access) or private/#private.",
    },
  },

  createOnce(context: Context) {
    return {
      ClassBody(node) {
        const classNode = (node as AnyNode).parent;
        if (!hasTargetDecorator(context, classNode)) return;

        for (const member of (node as AnyNode).body ?? []) {
          if (!FIELD_NODE_TYPES.has(member.type)) continue;

          const isInputModelMember = isApiCallFromAngularCore(
            context,
            member.value,
            INPUT_MODEL_APIS,
          );
          const isOutputMember = isApiCallFromAngularCore(context, member.value, OUTPUT_APIS);

          if (isInputModelMember && isNonPublicMember(member)) {
            context.report({
              node: member.key ?? member,
              messageId: "nonPublicInputModel",
              data: { name: getPropertyName(member.key) ?? "member" },
              fix: getVisibilityFix(context, member, "public"),
            });
            continue;
          }

          if (isOutputMember && isNonPublicMember(member)) {
            context.report({
              node: member.key ?? member,
              messageId: "nonPublicOutput",
              data: { name: getPropertyName(member.key) ?? "member" },
              fix: getVisibilityFix(context, member, "public"),
            });
            continue;
          }

          if (
            isPublicMember(member) &&
            isApiCallFromAngularCore(context, member.value, INJECT_APIS)
          ) {
            context.report({
              node: member.key ?? member,
              messageId: "publicInjectMember",
              data: { name: getPropertyName(member.key) ?? "member" },
              fix: getVisibilityFix(context, member, "protected"),
            });
          }
        }
      },
    };
  },
}) satisfies Rule;

export default publicComponentInterface;
