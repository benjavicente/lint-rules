import { defineRule } from "@oxlint/plugins";
import type { Context, Fix, Fixer, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import {
  isAngularCoreDecorator,
  isImportedNamespaceMember,
  isImportedReference,
} from "../../utilities/angular.js";

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

interface ClassifiedMember {
  element: AnyNode;
  group: MemberGroup;
  effectiveGroup: MemberGroup;
  name: string | null;
  dependencies: Set<string>;
}

const enum MemberGroup {
  PlainInject = 0,
  InputModel = 1,
  Output = 2,
  EverythingElse = 3,
}

function hasAngularClassDecorator(
  context: Context,
  classNode: AnyNode | null | undefined,
): boolean {
  if (!classNode || !Array.isArray(classNode.decorators)) return false;

  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, ANGULAR_CLASS_DECORATOR_NAMES),
  );
}

function isApiCall(
  context: Context,
  node: AnyNode | null | undefined,
  apiNames: Set<string>,
): boolean {
  if (!node || node.type !== "CallExpression") return false;

  const callee = node.callee;
  if (isImportedReference(context, callee, "@angular/core", apiNames)) return true;

  if (callee?.type !== "MemberExpression") return false;

  const supportsRequiredApi = [...INPUT_MODEL_CALL_NAMES].some((name) => apiNames.has(name));

  if (callee.object?.type === "Identifier") {
    if (getPropertyName(callee.property) === "required") {
      return (
        supportsRequiredApi &&
        isImportedReference(context, callee.object, "@angular/core", apiNames)
      );
    }

    return isImportedNamespaceMember(context, callee, "@angular/core", apiNames);
  }

  if (
    getPropertyName(callee.property) === "required" &&
    callee.object?.type === "MemberExpression" &&
    callee.object.object?.type === "Identifier"
  ) {
    return (
      supportsRequiredApi &&
      isImportedNamespaceMember(context, callee.object, "@angular/core", apiNames) &&
      apiNames.has(getPropertyName(callee.object.property) ?? "")
    );
  }

  return false;
}

function hasDecorator(context: Context, element: AnyNode, decoratorNames: Set<string>): boolean {
  return Array.isArray(element.decorators)
    ? element.decorators.some((decorator: AnyNode) =>
        isAngularCoreDecorator(context, decorator, decoratorNames),
      )
    : false;
}

function classifyMember(context: Context, element: AnyNode): MemberGroup | null {
  if (CLASS_FIELD_TYPES.has(element.type)) {
    if (isApiCall(context, element.value, new Set(["inject"]))) {
      return MemberGroup.PlainInject;
    }
    if (isApiCall(context, element.value, INPUT_MODEL_CALL_NAMES)) {
      return MemberGroup.InputModel;
    }
    if (hasDecorator(context, element, new Set(["Input"]))) {
      return MemberGroup.InputModel;
    }
    if (isApiCall(context, element.value, OUTPUT_CALL_NAMES)) {
      return MemberGroup.Output;
    }
    if (hasDecorator(context, element, new Set(["Output"]))) {
      return MemberGroup.Output;
    }
    return MemberGroup.EverythingElse;
  }

  if (element.type === "MethodDefinition") {
    return MemberGroup.EverythingElse;
  }

  return MemberGroup.EverythingElse;
}

function getMemberName(node: AnyNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier" || node.type === "PrivateIdentifier") return node.name;
  return null;
}

function collectThisMemberReferences(
  node: AnyNode | AnyNode[] | null | undefined,
  references = new Set<string>(),
): Set<string> {
  if (!node) return references;
  if (Array.isArray(node)) {
    for (const item of node) collectThisMemberReferences(item, references);
    return references;
  }

  if (node.type === "MemberExpression" && node.object?.type === "ThisExpression") {
    const propertyName = getPropertyName(node.property);
    if (propertyName) references.add(propertyName);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    collectThisMemberReferences(value as AnyNode | AnyNode[], references);
  }

  return references;
}

function applyDependencyGroups(classifiedMembers: ClassifiedMember[]): void {
  const membersByName = new Map<string, ClassifiedMember>();
  for (const member of classifiedMembers) {
    if (member.name) membersByName.set(member.name, member);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const member of classifiedMembers) {
      for (const dependencyName of member.dependencies) {
        const dependency = membersByName.get(dependencyName);
        if (!dependency) continue;
        if (dependency.effectiveGroup <= member.effectiveGroup) continue;

        dependency.effectiveGroup = member.effectiveGroup;
        changed = true;
      }
    }
  }
}

function dependsOn(
  member: ClassifiedMember,
  dependency: ClassifiedMember,
  membersByName: Map<string, ClassifiedMember>,
  seen = new Set<ClassifiedMember>(),
): boolean {
  if (!dependency.name) return false;
  if (member.dependencies.has(dependency.name)) return true;
  if (seen.has(member)) return false;
  seen.add(member);

  for (const dependencyName of member.dependencies) {
    const next = membersByName.get(dependencyName);
    if (next && dependsOn(next, dependency, membersByName, seen)) return true;
  }

  return false;
}

function getSortedMembers(classifiedMembers: ClassifiedMember[]): ClassifiedMember[] {
  const membersByName = new Map<string, ClassifiedMember>();
  for (const member of classifiedMembers) {
    if (member.name) membersByName.set(member.name, member);
  }

  return classifiedMembers.toSorted((left, right) => {
    if (dependsOn(left, right, membersByName)) return 1;
    if (dependsOn(right, left, membersByName)) return -1;
    return left.effectiveGroup - right.effectiveGroup;
  });
}

function hasUnresolvedPrioritizedDependency(
  member: ClassifiedMember,
  membersByName: Map<string, ClassifiedMember>,
): boolean {
  if (member.group === MemberGroup.EverythingElse) return false;
  for (const dependencyName of member.dependencies) {
    if (!membersByName.has(dependencyName)) return true;
  }
  return false;
}

function getSortedMembersFix(
  context: Context,
  classBody: AnyNode,
  classifiedMembers: ClassifiedMember[],
): ((fixer: Fixer) => Fix) | undefined {
  if (!classifiedMembers.length) return undefined;
  if ((classBody.body ?? []).length !== classifiedMembers.length) return undefined;

  const sortableRanges: Array<[number, number]> = [];
  const membersByName = new Map<string, ClassifiedMember>();
  for (const member of classifiedMembers) {
    if (member.name) membersByName.set(member.name, member);
  }

  for (const member of classifiedMembers) {
    const { element } = member;
    if (!CLASS_FIELD_TYPES.has(element.type)) return undefined;
    if (element.type === "AccessorProperty") return undefined;
    if (element.computed) return undefined;
    if (Array.isArray(element.decorators) && element.decorators.length > 0) return undefined;
    if (hasUnresolvedPrioritizedDependency(member, membersByName)) {
      return undefined;
    }

    const range = getRange(element);
    if (!range) return undefined;
    if (!context.sourceCode.text.slice(range[0], range[1]).trimEnd().endsWith(";")) {
      return undefined;
    }
    sortableRanges.push(range);
  }

  const sortedMembers = getSortedMembers(classifiedMembers);
  const unchanged = sortedMembers.every(
    (member, index) => member.element === classifiedMembers[index]?.element,
  );
  if (unchanged) return undefined;

  return (fixer) => {
    const sourceText = context.sourceCode.text;
    const sortedTexts = sortedMembers.map(({ element }) => {
      const range = getRange(element);
      return range ? sourceText.slice(range[0], range[1]) : "";
    });

    let output = "";
    for (let index = 0; index < sortableRanges.length; index += 1) {
      const [, end] = sortableRanges[index]!;
      const nextStart = sortableRanges[index + 1]?.[0];
      output += sortedTexts[index];
      output += sourceText.slice(end, nextStart ?? end);
    }

    return fixer.replaceTextRange([sortableRanges[0]![0], sortableRanges.at(-1)![1]], output);
  };
}

const classMemberOrder = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Angular class members to be ordered as inject fields, inputs/models, outputs, then everything else.",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      outOfOrder:
        "Angular class member should be ordered before {{previousGroup}} and with {{expectedGroup}}.",
    },
  },

  createOnce(context: Context) {
    return {
      ClassBody(node) {
        const classBody = node as AnyNode;
        if (!hasAngularClassDecorator(context, classBody.parent)) return;

        let highestSeen: MemberGroup | null = null;
        const classifiedMembers: ClassifiedMember[] = [];
        const outOfOrderReports: Array<{
          element: AnyNode;
          effectiveGroup: MemberGroup;
          previousEffectiveGroup: MemberGroup;
        }> = [];

        for (const element of classBody.body ?? []) {
          const group = classifyMember(context, element);
          if (group === null) continue;
          classifiedMembers.push({
            element,
            group,
            effectiveGroup: group,
            name: getMemberName(element.key),
            dependencies: collectThisMemberReferences(element.value),
          });
        }

        applyDependencyGroups(classifiedMembers);

        for (const { element, effectiveGroup } of classifiedMembers) {
          if (highestSeen !== null && effectiveGroup < highestSeen) {
            outOfOrderReports.push({
              element,
              effectiveGroup,
              previousEffectiveGroup: highestSeen,
            });
            continue;
          }

          highestSeen = effectiveGroup;
        }

        if (!outOfOrderReports.length) return;

        const fix = getSortedMembersFix(context, classBody, classifiedMembers);
        for (const [index, report] of outOfOrderReports.entries()) {
          context.report({
            node: report.element,
            messageId: "outOfOrder",
            data: {
              expectedGroup: ORDER_LABELS[report.effectiveGroup],
              previousGroup: ORDER_LABELS[report.previousEffectiveGroup],
            },
            fix: index === 0 ? fix : undefined,
          });
        }
      },
    };
  },
}) satisfies Rule;

export default classMemberOrder;
