import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isImportedNamespaceMember, isImportedReference } from "../../utilities/angular.js";
import { findNearestBindingIdentifier } from "../../utilities/scope.js";

const SIGNAL_WRITE_METHODS = new Set(["set", "update", "mutate"]);
const KNOWN_SIGNAL_CREATION_FUNCTIONS = new Set(["signal", "model", "linkedSignal"]);
const LINKED_SIGNAL_CREATOR_NAME = "linkedSignal";
const COMPUTED_CREATOR_NAME = "computed";
const EFFECT_CREATOR_NAME = "effect";
const EFFECT_CREATOR_NAMES = new Set([EFFECT_CREATOR_NAME]);
const COMPUTED_CREATOR_NAMES = new Set([COMPUTED_CREATOR_NAME]);
const LINKED_SIGNAL_CREATOR_NAMES = new Set([LINKED_SIGNAL_CREATOR_NAME]);

interface RuleOptions {
  allowEffects?: boolean;
  allowComputedAndLinkedSignals?: boolean;
}

function isSignalCreatorCall(context: Context, node: AnyNode | null | undefined): boolean {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  return (
    isImportedReference(context, callee, "@angular/core", KNOWN_SIGNAL_CREATION_FUNCTIONS) ||
    isImportedNamespaceMember(context, callee, "@angular/core", KNOWN_SIGNAL_CREATION_FUNCTIONS)
  );
}

function isEffectCall(context: Context, node: AnyNode): boolean {
  const callee = node.callee;
  return (
    isImportedReference(context, callee, "@angular/core", EFFECT_CREATOR_NAMES) ||
    isImportedNamespaceMember(context, callee, "@angular/core", EFFECT_CREATOR_NAMES)
  );
}

function isReactiveCreatorCall(
  context: Context,
  node: AnyNode,
  creatorNames: Set<string>,
): boolean {
  const callee = node.callee;
  return (
    isImportedReference(context, callee, "@angular/core", creatorNames) ||
    isImportedNamespaceMember(context, callee, "@angular/core", creatorNames)
  );
}

function isKnownSignalObject(
  context: Context,
  objectNode: AnyNode | null | undefined,
  signalVariableBindings: Map<string, Set<AnyNode>>,
  classSignalProperties: Set<string>,
): boolean {
  if (!objectNode) return false;
  if (objectNode.type === "Identifier") {
    const trackedBindings = signalVariableBindings.get(objectNode.name);
    if (!trackedBindings) return false;

    const nearestBinding = findNearestBindingIdentifier(context, objectNode);
    return !!nearestBinding && trackedBindings.has(nearestBinding);
  }

  return (
    objectNode.type === "MemberExpression" &&
    objectNode.object?.type === "ThisExpression" &&
    objectNode.property?.type === "Identifier" &&
    classSignalProperties.has(objectNode.property.name)
  );
}

const FUNCTION_NODE_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

function visitNodes(
  node: AnyNode | AnyNode[] | null | undefined,
  visitor: (node: AnyNode) => void,
  skipFunctionBodies = false,
): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) visitNodes(item, visitor, skipFunctionBodies);
    return;
  }

  if (skipFunctionBodies && FUNCTION_NODE_TYPES.has(node.type)) return;

  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    visitNodes(value as AnyNode | AnyNode[], visitor, skipFunctionBodies);
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
    const signalVariableBindings = new Map<string, Set<AnyNode>>();
    const classSignalProperties = new Set<string>();

    return {
      before() {
        signalVariableBindings.clear();
        classSignalProperties.clear();
      },

      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        if (declarator.id?.type !== "Identifier") return;
        if (!isSignalCreatorCall(context, declarator.init)) return;
        const bindings = signalVariableBindings.get(declarator.id.name) ?? new Set<AnyNode>();
        bindings.add(declarator.id);
        signalVariableBindings.set(declarator.id.name, bindings);
      },

      "PropertyDefinition, FieldDefinition, AccessorProperty"(node) {
        const property = node as AnyNode;
        if (property.key?.type !== "Identifier") return;
        if (!isSignalCreatorCall(context, property.value)) return;
        classSignalProperties.add(property.key.name);
      },

      CallExpression(node) {
        const options = (context.options?.[0] ?? {}) as RuleOptions;
        const allowEffects = options.allowEffects ?? false;
        const allowComputedAndLinkedSignals = options.allowComputedAndLinkedSignals ?? false;

        const callNode = node as AnyNode;
        const callbackCandidates: { callback: AnyNode; contextName: string }[] = [];

        if (!allowEffects && isEffectCall(context, callNode)) {
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
          isReactiveCreatorCall(context, callNode, COMPUTED_CREATOR_NAMES)
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
          isReactiveCreatorCall(context, callNode, LINKED_SIGNAL_CREATOR_NAMES)
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
          visitNodes(
            callback.body as AnyNode,
            (current) => {
              if (current.type !== "CallExpression") return;
              const callee = current.callee;
              if (callee?.type !== "MemberExpression") return;

              const methodName = getPropertyName(callee.property);
              if (!methodName || !SIGNAL_WRITE_METHODS.has(methodName)) return;
              if (
                !isKnownSignalObject(
                  context,
                  callee.object,
                  signalVariableBindings,
                  classSignalProperties,
                )
              ) {
                return;
              }

              context.report({
                node: callee.property ?? callee,
                messageId: "avoidSignalWriteInReactiveContext",
                data: { contextName },
              });
            },
            true,
          );
        }
      },

      after() {
        signalVariableBindings.clear();
        classSignalProperties.clear();
      },
    };
  },
}) satisfies Rule;

export default avoidWritingSignalsInReactiveContext;
