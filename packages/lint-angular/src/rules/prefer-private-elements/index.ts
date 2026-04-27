import { defineRule } from "@oxlint/plugins";
import type { Context, Fix, Fixer, Rule } from "@oxlint/plugins";
import { getPropertyName, getRange } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

interface DeclarationEdit {
  privateRange: [number, number];
  nameRange: [number, number];
  name: string;
}

interface PrivateTarget {
  element: AnyNode;
  nameNode: AnyNode;
  name: string;
  isStatic: boolean;
  accessorKind: "get" | "set" | null;
}

interface ReferenceEdit {
  range: [number, number];
  name: string;
}

interface FixPlan {
  declarations: DeclarationEdit[];
  references: ReferenceEdit[];
}

function getPrivateTarget(element: AnyNode): PrivateTarget | null {
  if (
    element.type !== "PropertyDefinition" &&
    element.type !== "FieldDefinition" &&
    element.type !== "AccessorProperty" &&
    element.type !== "MethodDefinition"
  ) {
    return null;
  }

  if (element.accessibility !== "private") return null;
  if (element.computed) return null;
  if (element.type === "MethodDefinition" && element.kind === "constructor") return null;

  const name = getPropertyName(element.key);
  if (!name || element.key?.type !== "Identifier") return null;

  return {
    element,
    nameNode: element.key,
    name,
    isStatic: !!element.static,
    accessorKind:
      element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")
        ? element.kind
        : null,
  };
}

function getPrivateModifierRange(
  context: Context,
  element: AnyNode,
  nameNode: AnyNode,
): [number, number] | null {
  const elementRange = getRange(element);
  const nameRange = getRange(nameNode);
  if (!elementRange || !nameRange) return null;

  const text = context.sourceCode.text.slice(elementRange[0], nameRange[0]);
  const match = /\bprivate\b\s*/u.exec(text);
  return match
    ? [elementRange[0] + match.index, elementRange[0] + match.index + match[0].length]
    : null;
}

function sameStaticName(target: PrivateTarget, candidate: AnyNode): boolean {
  return !!candidate.static === target.isStatic && getPropertyName(candidate.key) === target.name;
}

function collectDeclarationEdits(
  context: Context,
  classNode: AnyNode,
  target: PrivateTarget,
): DeclarationEdit[] | null {
  const privateRange = getPrivateModifierRange(context, target.element, target.nameNode);
  const nameRange = getRange(target.nameNode);
  if (!privateRange || !nameRange) return null;

  const declarations: DeclarationEdit[] = [{ privateRange, nameRange, name: target.name }];

  for (const element of classNode.body?.body ?? []) {
    if (element === target.element || !sameStaticName(target, element)) continue;

    const other = getPrivateTarget(element);
    const isAccessorPair =
      target.accessorKind && other?.accessorKind && target.accessorKind !== other.accessorKind;

    if (!isAccessorPair) return null;

    const otherPrivateRange = getPrivateModifierRange(context, other.element, other.nameNode);
    const otherNameRange = getRange(other.nameNode);
    if (!otherPrivateRange || !otherNameRange) return null;
    declarations.push({
      privateRange: otherPrivateRange,
      nameRange: otherNameRange,
      name: other.name,
    });
  }

  return declarations;
}

function isThisOrClassReceiver(
  node: AnyNode | null | undefined,
  target: PrivateTarget,
  className: string | null,
): boolean {
  if (!node) return false;
  if (target.isStatic) {
    return node.type === "Identifier" && !!className && node.name === className;
  }
  return node.type === "ThisExpression";
}

function collectReferenceEdits(
  classNode: AnyNode,
  target: PrivateTarget,
  className: string | null,
): ReferenceEdit[] | null {
  const references: ReferenceEdit[] = [];
  let unsupported = false;

  function visit(node: AnyNode | AnyNode[] | null | undefined, functionDepth: number): void {
    if (!node || unsupported) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, functionDepth);
      return;
    }

    if (
      node !== classNode &&
      (node.type === "ClassDeclaration" || node.type === "ClassExpression")
    ) {
      return;
    }

    const nextFunctionDepth =
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
        ? functionDepth + 1
        : functionDepth;

    if (
      node.type === "MemberExpression" &&
      !node.computed &&
      getPropertyName(node.property) === target.name
    ) {
      if (nextFunctionDepth > 1 || !isThisOrClassReceiver(node.object, target, className)) {
        unsupported = true;
        return;
      }

      const range = getRange(node.property);
      if (!range) {
        unsupported = true;
        return;
      }
      references.push({ range, name: target.name });
    }

    if (
      node.type === "MemberExpression" &&
      node.computed &&
      getPropertyName(node.property) === target.name
    ) {
      unsupported = true;
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "parent") continue;
      if (!value || typeof value !== "object") continue;
      visit(value as AnyNode | AnyNode[], nextFunctionDepth);
    }
  }

  visit(classNode, 0);
  return unsupported ? null : references;
}

function buildFixPlan(context: Context, classNode: AnyNode, target: PrivateTarget): FixPlan | null {
  const declarations = collectDeclarationEdits(context, classNode, target);
  if (!declarations) return null;

  const className = classNode.id?.type === "Identifier" ? classNode.id.name : null;
  const references = collectReferenceEdits(classNode, target, className);
  if (!references) return null;

  return { declarations, references };
}

function getEnclosingClass(context: Context, node: AnyNode): AnyNode | null {
  const ancestors = context.sourceCode.getAncestors(node) as AnyNode[];
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor?.type === "ClassDeclaration" || ancestor?.type === "ClassExpression") {
      return ancestor;
    }
  }
  return null;
}

function shouldSkipDuplicateAccessorReport(classNode: AnyNode, target: PrivateTarget): boolean {
  if (!target.accessorKind) return false;

  return (classNode.body?.body ?? []).some((element: AnyNode) => {
    const other = getPrivateTarget(element);
    return (
      other &&
      other !== target &&
      other.name === target.name &&
      other.isStatic === target.isStatic &&
      other.accessorKind &&
      other.accessorKind !== target.accessorKind &&
      (getRange(other.element)?.[0] ?? Number.POSITIVE_INFINITY) <
        (getRange(target.element)?.[0] ?? 0)
    );
  });
}

function applyFixPlan(fixer: Fixer, plan: FixPlan): Fix[] {
  const fixes: Fix[] = [];

  for (const declaration of plan.declarations) {
    fixes.push(fixer.removeRange(declaration.privateRange));
    fixes.push(fixer.replaceTextRange(declaration.nameRange, `#${declaration.name}`));
  }

  for (const reference of plan.references) {
    fixes.push(fixer.replaceTextRange(reference.range, `#${reference.name}`));
  }

  return fixes;
}

const preferPrivateElements = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer ECMAScript private elements over TypeScript private members.",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      preferPrivateElements:
        "TypeScript private member {{name}} should be an ECMAScript private element.",
    },
  },

  createOnce(context: Context) {
    return {
      "PropertyDefinition, FieldDefinition, AccessorProperty, MethodDefinition"(node) {
        const target = getPrivateTarget(node as AnyNode);
        if (!target) return;

        const classNode = getEnclosingClass(context, node as AnyNode);
        if (!classNode || shouldSkipDuplicateAccessorReport(classNode, target)) return;

        const fixPlan = buildFixPlan(context, classNode, target);
        context.report({
          node: target.nameNode,
          messageId: "preferPrivateElements",
          data: { name: target.name },
          fix: fixPlan ? (fixer) => applyFixPlan(fixer, fixPlan) : undefined,
        });
      },
    };
  },
}) satisfies Rule;

export default preferPrivateElements;
