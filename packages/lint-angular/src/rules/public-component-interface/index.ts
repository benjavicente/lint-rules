import { defineRule } from "@oxlint/plugins";
import type { Context, Fix, Fixer, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { addAngularCoreDecoratorImport, isAngularCoreDecorator } from "../../utilities/angular.js";
import type { AngularCoreDecoratorImports } from "../../utilities/angular.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

const TARGET_DECORATORS = new Set(["Component", "Directive"]);
const INPUT_MODEL_APIS = new Set(["input", "model"]);
const OUTPUT_APIS = new Set(["output", "outputFromObservable"]);
const INJECT_APIS = new Set(["inject"]);
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

function isApiCallFromTrackedImports(
  context: Context,
  node: AnyNode | null | undefined,
  importedApiLocalNames: Set<string>,
  angularNamespaces: Set<string>,
  apiNames: Set<string>,
): boolean {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee;

  if (callee?.type === "Identifier") {
    return importedApiLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee);
  }

  if (callee?.type !== "MemberExpression") return false;

  const supportsRequiredApi = [...INPUT_MODEL_APIS].some((name) => apiNames.has(name));

  // Handles input.required(...) and alias.required(...)
  if (getPropertyName(callee.property) === "required" && callee.object?.type === "Identifier") {
    return (
      supportsRequiredApi &&
      importedApiLocalNames.has(callee.object.name) &&
      !isShadowedIdentifier(context, callee.object)
    );
  }

  // Handles ng.input(...) and ng.output(...)
  if (callee.object?.type === "Identifier" && angularNamespaces.has(callee.object.name)) {
    const namespaceApiName = getPropertyName(callee.property);
    return (
      !!namespaceApiName &&
      apiNames.has(namespaceApiName) &&
      !isShadowedIdentifier(context, callee.object)
    );
  }

  // Handles ng.input.required(...) / ng.model.required(...)
  if (
    getPropertyName(callee.property) === "required" &&
    callee.object?.type === "MemberExpression" &&
    callee.object.object?.type === "Identifier" &&
    angularNamespaces.has(callee.object.object.name)
  ) {
    const namespaceApiName = getPropertyName(callee.object.property);
    return (
      supportsRequiredApi &&
      !!namespaceApiName &&
      apiNames.has(namespaceApiName) &&
      !isShadowedIdentifier(context, callee.object.object)
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
    const inputModelLocalNames = new Set<string>();
    const outputLocalNames = new Set<string>();
    const injectLocalNames = new Set<string>();
    const angularNamespaces = new Set<string>();
    const decoratorImports: AngularCoreDecoratorImports = {
      decoratorNames: TARGET_DECORATORS,
      decoratorLocalNames: new Set<string>(),
      angularNamespaces,
    };

    return {
      before() {
        inputModelLocalNames.clear();
        outputLocalNames.clear();
        injectLocalNames.clear();
        angularNamespaces.clear();
        decoratorImports.decoratorLocalNames.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          addAngularCoreDecoratorImport(specifier as AnyNode, TARGET_DECORATORS, decoratorImports);

          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (!importedName) continue;
            if (INPUT_MODEL_APIS.has(importedName)) inputModelLocalNames.add(specifier.local.name);
            if (OUTPUT_APIS.has(importedName)) outputLocalNames.add(specifier.local.name);
            if (INJECT_APIS.has(importedName)) injectLocalNames.add(specifier.local.name);
            continue;
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            angularNamespaces.add(specifier.local.name);
          }
        }
      },

      ClassBody(node) {
        const classNode = (node as AnyNode).parent;
        if (!hasTargetDecorator(context, classNode, decoratorImports)) return;

        for (const member of (node as AnyNode).body ?? []) {
          if (!FIELD_NODE_TYPES.has(member.type)) continue;

          const isInputModelMember = isApiCallFromTrackedImports(
            context,
            member.value,
            inputModelLocalNames,
            angularNamespaces,
            INPUT_MODEL_APIS,
          );
          const isOutputMember = isApiCallFromTrackedImports(
            context,
            member.value,
            outputLocalNames,
            angularNamespaces,
            OUTPUT_APIS,
          );

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
            isApiCallFromTrackedImports(
              context,
              member.value,
              injectLocalNames,
              angularNamespaces,
              INJECT_APIS,
            )
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

      "Program:exit"() {
        inputModelLocalNames.clear();
        outputLocalNames.clear();
        injectLocalNames.clear();
        angularNamespaces.clear();
      },
    };
  },
}) satisfies Rule;

export default publicComponentInterface;
