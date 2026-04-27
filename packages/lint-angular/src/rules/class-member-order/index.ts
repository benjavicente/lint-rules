import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getDecoratorName, getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

const ANGULAR_CLASS_DECORATOR_NAMES = new Set([
  "Component",
  "Directive",
  "Injectable",
  "Pipe",
  "NgModule",
]);

const INPUT_MODEL_CALL_NAMES = new Set(["input", "model"]);
const OUTPUT_CALL_NAMES = new Set(["output", "outputFromObservable"]);
const CLASS_FIELD_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);

const ORDER_LABELS = [
  "plain inject fields",
  "inputs/models",
  "outputs",
  "everything else",
] as const;

const enum MemberGroup {
  PlainInject = 0,
  InputModel = 1,
  Output = 2,
  EverythingElse = 3,
}

function hasAngularClassDecorator(classNode: AnyNode | null | undefined): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;

  return classNode.decorators.some((decorator: AnyNode) =>
    ANGULAR_CLASS_DECORATOR_NAMES.has(getDecoratorName(decorator) ?? ""),
  );
}

function getCallName(node: AnyNode | null | undefined): string | null {
  if (!node || node.type !== "CallExpression") return null;

  const callee = node.callee;
  if (callee?.type === "Identifier") return callee.name;
  if (callee?.type === "MemberExpression") return getPropertyName(callee.property);

  return null;
}

function hasDecorator(element: AnyNode, names: Set<string>): boolean {
  return Array.isArray(element.decorators)
    ? element.decorators.some((decorator: AnyNode) => names.has(getDecoratorName(decorator) ?? ""))
    : false;
}

function isDirectInjectCall(value: AnyNode | null | undefined): boolean {
  if (!value || value.type !== "CallExpression") return false;

  const callee = value.callee;
  return (
    (callee?.type === "Identifier" && callee.name === "inject") ||
    (callee?.type === "MemberExpression" && getPropertyName(callee.property) === "inject")
  );
}

function classifyMember(element: AnyNode): MemberGroup | null {
  if (CLASS_FIELD_TYPES.has(element.type)) {
    const callName = getCallName(element.value);

    if (isDirectInjectCall(element.value)) return MemberGroup.PlainInject;
    if (callName && INPUT_MODEL_CALL_NAMES.has(callName)) return MemberGroup.InputModel;
    if (hasDecorator(element, new Set(["Input"]))) return MemberGroup.InputModel;
    if (callName && OUTPUT_CALL_NAMES.has(callName)) return MemberGroup.Output;
    if (hasDecorator(element, new Set(["Output"]))) return MemberGroup.Output;
    return MemberGroup.EverythingElse;
  }

  if (element.type === "MethodDefinition") {
    return MemberGroup.EverythingElse;
  }

  return MemberGroup.EverythingElse;
}

const classMemberOrder = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Angular class members to be ordered as inject fields, inputs/models, outputs, then everything else.",
      recommended: true,
    },
    schema: [],
    messages: {
      outOfOrder:
        "Angular class member should be ordered before {{previousGroup}} and with {{expectedGroup}}.",
    },
  },

  createOnce(context: Context) {
    return {
      ClassBody(node) {
        if (!hasAngularClassDecorator((node as AnyNode).parent)) return;

        let highestSeen: MemberGroup | null = null;

        for (const element of (node as AnyNode).body ?? []) {
          const group = classifyMember(element);
          if (group === null) continue;

          if (highestSeen !== null && group < highestSeen) {
            context.report({
              node: element,
              messageId: "outOfOrder",
              data: {
                expectedGroup: ORDER_LABELS[group],
                previousGroup: ORDER_LABELS[highestSeen],
              },
            });
            continue;
          }

          highestSeen = group;
        }
      },
    };
  },
}) satisfies Rule;

export default classMemberOrder;
