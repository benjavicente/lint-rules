import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

const SIGNAL_WRITE_METHODS = new Set(["set", "update", "mutate"]);
const KNOWN_SIGNAL_CREATION_FUNCTIONS = new Set(["signal", "model", "linkedSignal"]);
const LINKED_SIGNAL_CREATOR_NAME = "linkedSignal";
const COMPUTED_CREATOR_NAME = "computed";
const EFFECT_CREATOR_NAME = "effect";

interface RuleOptions {
  allowEffects?: boolean;
  allowComputedAndLinkedSignals?: boolean;
}

function isAngularCoreNamespaceMember(
  node: AnyNode | null | undefined,
  angularNamespaces: Set<string>,
  memberName: string,
): boolean {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    angularNamespaces.has(node.object.name) &&
    getPropertyName(node.property) === memberName
  );
}

function isSignalCreatorCall(
  node: AnyNode | null | undefined,
  signalCreatorNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  return (
    (callee?.type === "Identifier" && signalCreatorNames.has(callee.name)) ||
    [...KNOWN_SIGNAL_CREATION_FUNCTIONS].some((name) =>
      isAngularCoreNamespaceMember(callee, angularNamespaces, name),
    )
  );
}

function isEffectCall(
  node: AnyNode,
  effectNames: Set<string>,
  angularNamespaces: Set<string>,
): boolean {
  const callee = node.callee;
  return (
    (callee?.type === "Identifier" && effectNames.has(callee.name)) ||
    isAngularCoreNamespaceMember(callee, angularNamespaces, "effect")
  );
}

function isReactiveCreatorCall(
  node: AnyNode,
  creatorNames: Set<string>,
  angularNamespaces: Set<string>,
  angularMemberName: string,
): boolean {
  const callee = node.callee;
  return (
    (callee?.type === "Identifier" && creatorNames.has(callee.name)) ||
    isAngularCoreNamespaceMember(callee, angularNamespaces, angularMemberName)
  );
}

function isKnownSignalObject(
  objectNode: AnyNode | null | undefined,
  signalVariables: Set<string>,
  classSignalProperties: Set<string>,
): boolean {
  if (!objectNode) return false;
  if (objectNode.type === "Identifier") return signalVariables.has(objectNode.name);

  return (
    objectNode.type === "MemberExpression" &&
    objectNode.object?.type === "ThisExpression" &&
    objectNode.property?.type === "Identifier" &&
    classSignalProperties.has(objectNode.property.name)
  );
}

function visitNodes(
  node: AnyNode | AnyNode[] | null | undefined,
  visitor: (node: AnyNode) => void,
): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) visitNodes(item, visitor);
    return;
  }

  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    visitNodes(value as AnyNode | AnyNode[], visitor);
  }
}

const avoidWritingSignalsInReactiveContext = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Avoid writing to signals inside reactive callbacks such as effect(), computed(), and linkedSignal().",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowEffects: {
            type: "boolean",
            default: false,
          },
          allowComputedAndLinkedSignals: {
            type: "boolean",
            default: false,
          },
        },
      },
    ],
    messages: {
      avoidSignalWriteInReactiveContext:
        "Avoid setting signal values inside {{contextName}}; move writes outside reactive derivations and effects.",
    },
  },

  createOnce(context: Context) {
    const effectNames = new Set<string>();
    const computedNames = new Set<string>();
    const linkedSignalNames = new Set<string>();
    const signalCreatorNames = new Set<string>();
    const angularNamespaces = new Set<string>();
    const signalVariables = new Set<string>();
    const classSignalProperties = new Set<string>();

    return {
      before() {
        effectNames.clear();
        computedNames.clear();
        linkedSignalNames.clear();
        signalCreatorNames.clear();
        angularNamespaces.clear();
        signalVariables.clear();
        classSignalProperties.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/core") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (importedName === EFFECT_CREATOR_NAME) effectNames.add(specifier.local.name);
            if (importedName === COMPUTED_CREATOR_NAME) computedNames.add(specifier.local.name);
            if (importedName === LINKED_SIGNAL_CREATOR_NAME) {
              linkedSignalNames.add(specifier.local.name);
            }
            if (importedName && KNOWN_SIGNAL_CREATION_FUNCTIONS.has(importedName)) {
              signalCreatorNames.add(specifier.local.name);
            }
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            angularNamespaces.add(specifier.local.name);
          }
        }
      },

      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        if (declarator.id?.type !== "Identifier") return;
        if (!isSignalCreatorCall(declarator.init, signalCreatorNames, angularNamespaces)) return;
        signalVariables.add(declarator.id.name);
      },

      "PropertyDefinition, FieldDefinition, AccessorProperty"(node) {
        const property = node as AnyNode;
        if (property.key?.type !== "Identifier") return;
        if (!isSignalCreatorCall(property.value, signalCreatorNames, angularNamespaces)) return;
        classSignalProperties.add(property.key.name);
      },

      CallExpression(node) {
        const options = (context.options?.[0] ?? {}) as RuleOptions;
        const allowEffects = options.allowEffects ?? false;
        const allowComputedAndLinkedSignals = options.allowComputedAndLinkedSignals ?? false;

        const callNode = node as AnyNode;
        const callbackCandidates: { callback: AnyNode; contextName: string }[] = [];

        if (!allowEffects && isEffectCall(callNode, effectNames, angularNamespaces)) {
          const callback = callNode.arguments?.[0] as AnyNode | undefined;
          if (
            callback?.type === "ArrowFunctionExpression" ||
            callback?.type === "FunctionExpression"
          ) {
            callbackCandidates.push({ callback, contextName: "effect()" });
          }
        }

        if (
          !allowComputedAndLinkedSignals &&
          isReactiveCreatorCall(callNode, computedNames, angularNamespaces, COMPUTED_CREATOR_NAME)
        ) {
          const callback = callNode.arguments?.[0] as AnyNode | undefined;
          if (
            callback?.type === "ArrowFunctionExpression" ||
            callback?.type === "FunctionExpression"
          ) {
            callbackCandidates.push({ callback, contextName: "computed()" });
          }
        }

        if (
          !allowComputedAndLinkedSignals &&
          isReactiveCreatorCall(
            callNode,
            linkedSignalNames,
            angularNamespaces,
            LINKED_SIGNAL_CREATOR_NAME,
          )
        ) {
          for (const argumentNode of callNode.arguments ?? []) {
            const argument = argumentNode as AnyNode;
            if (
              argument.type === "ArrowFunctionExpression" ||
              argument.type === "FunctionExpression"
            ) {
              callbackCandidates.push({ callback: argument, contextName: "linkedSignal()" });
              continue;
            }

            if (argument.type !== "ObjectExpression") continue;
            for (const propertyNode of argument.properties ?? []) {
              const property = propertyNode as AnyNode;
              if (property.type !== "Property" || property.computed) continue;
              if (getPropertyName(property.key) !== "computation") continue;
              if (
                property.value?.type !== "ArrowFunctionExpression" &&
                property.value?.type !== "FunctionExpression"
              ) {
                continue;
              }
              callbackCandidates.push({
                callback: property.value,
                contextName: "linkedSignal().computation",
              });
            }
          }
        }

        for (const { callback, contextName } of callbackCandidates) {
          visitNodes(callback.body as AnyNode, (current) => {
            if (current.type !== "CallExpression") return;
            const callee = current.callee;
            if (callee?.type !== "MemberExpression") return;

            const methodName = getPropertyName(callee.property);
            if (!methodName || !SIGNAL_WRITE_METHODS.has(methodName)) return;
            if (!isKnownSignalObject(callee.object, signalVariables, classSignalProperties)) return;

            context.report({
              node: callee.property ?? callee,
              messageId: "avoidSignalWriteInReactiveContext",
              data: { contextName },
            });
          });
        }
      },

      "Program:exit"() {
        effectNames.clear();
        computedNames.clear();
        linkedSignalNames.clear();
        signalCreatorNames.clear();
        angularNamespaces.clear();
        signalVariables.clear();
        classSignalProperties.clear();
      },
    };
  },
}) satisfies Rule;

export default avoidWritingSignalsInReactiveContext;
