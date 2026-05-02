import type { Context } from "@oxlint/plugins";
import { getNodeStart } from "./ast.js";
import type { AnyNode } from "./ast.js";

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

function isFunction(node: AnyNode | null | undefined): boolean {
  return !!node && FUNCTION_TYPES.has(node.type);
}

function addBindingIdentifierNodes(node: AnyNode | null | undefined, identifiers: AnyNode[]): void {
  if (!node) return;

  if (node.type === "Identifier") {
    identifiers.push(node);
    return;
  }

  if (node.type === "AssignmentPattern") {
    addBindingIdentifierNodes(node.left, identifiers);
    return;
  }

  if (node.type === "RestElement" || node.type === "TSParameterProperty") {
    addBindingIdentifierNodes(node.argument ?? node.parameter, identifiers);
    return;
  }

  if (node.type === "ArrayPattern") {
    for (const element of node.elements ?? []) addBindingIdentifierNodes(element, identifiers);
    return;
  }

  if (node.type === "ObjectPattern") {
    for (const property of node.properties ?? []) {
      if (property.type === "Property") {
        addBindingIdentifierNodes(property.value, identifiers);
      } else {
        addBindingIdentifierNodes(property.argument, identifiers);
      }
    }
  }
}

export function getBindingIdentifierNodes(node: AnyNode | null | undefined): AnyNode[] {
  const identifiers: AnyNode[] = [];
  addBindingIdentifierNodes(node, identifiers);
  return identifiers;
}

function getBindingNames(node: AnyNode | null | undefined): Set<string> {
  return new Set(getBindingIdentifierNodes(node).map((identifier) => identifier.name));
}

function hasBindingName(node: AnyNode | null | undefined, name: string): boolean {
  return getBindingNames(node).has(name);
}

function getMatchingBindingIdentifier(
  node: AnyNode | null | undefined,
  name: string,
): AnyNode | null {
  return getBindingIdentifierNodes(node).find((identifier) => identifier.name === name) ?? null;
}

function isBeforeReference(node: AnyNode, reference: AnyNode): boolean {
  const nodeStart = getNodeStart(node);
  const referenceStart = getNodeStart(reference);
  return nodeStart !== null && referenceStart !== null && nodeStart < referenceStart;
}

function hasDeclarationBeforeReference(
  node: AnyNode | AnyNode[] | null | undefined,
  name: string,
  reference: AnyNode,
): boolean {
  if (!node) return false;

  if (Array.isArray(node)) {
    return node.some((child) => hasDeclarationBeforeReference(child, name, reference));
  }

  if (!isBeforeReference(node, reference)) return false;

  if (node.type === "VariableDeclarator") {
    return hasBindingName(node.id, name);
  }

  if (
    (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") &&
    node.id?.name === name
  ) {
    return true;
  }

  if (node !== reference && isFunction(node)) {
    return false;
  }

  if (node !== reference && (node.type === "ClassDeclaration" || node.type === "ClassExpression")) {
    return false;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    if (hasDeclarationBeforeReference(value as AnyNode | AnyNode[], name, reference)) return true;
  }

  return false;
}

function findDeclarationBeforeReference(
  node: AnyNode | AnyNode[] | null | undefined,
  name: string,
  reference: AnyNode,
): AnyNode | null {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const declaration = findDeclarationBeforeReference(child, name, reference);
      if (declaration) return declaration;
    }
    return null;
  }

  if (!isBeforeReference(node, reference)) return null;

  if (node.type === "VariableDeclarator") {
    return getMatchingBindingIdentifier(node.id, name);
  }

  if (
    (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") &&
    node.id?.name === name
  ) {
    return node.id;
  }

  if (node !== reference && isFunction(node)) return null;

  if (node !== reference && (node.type === "ClassDeclaration" || node.type === "ClassExpression")) {
    return null;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (!value || typeof value !== "object") continue;
    const declaration = findDeclarationBeforeReference(
      value as AnyNode | AnyNode[],
      name,
      reference,
    );
    if (declaration) return declaration;
  }

  return null;
}

export function findNearestBindingIdentifier(
  context: Context,
  node: AnyNode | null | undefined,
): AnyNode | null {
  if (node?.type !== "Identifier") return null;

  const ancestors = context.sourceCode.getAncestors(node) as AnyNode[];
  for (const ancestor of ancestors.toReversed()) {
    if (isFunction(ancestor)) {
      for (const param of ancestor.params ?? []) {
        const binding = getMatchingBindingIdentifier(param, node.name);
        if (binding) return binding;
      }
    }

    if (ancestor.type === "CatchClause") {
      const binding = getMatchingBindingIdentifier(ancestor.param, node.name);
      if (binding) return binding;
    }

    if (ancestor.type === "BlockStatement" || ancestor.type === "Program") {
      const binding = findDeclarationBeforeReference(ancestor.body, node.name, node);
      if (binding) return binding;
    }
  }

  return null;
}

export function isShadowedIdentifier(context: Context, node: AnyNode | null | undefined): boolean {
  if (node?.type !== "Identifier") return false;

  const ancestors = context.sourceCode.getAncestors(node) as AnyNode[];
  for (const ancestor of ancestors.toReversed()) {
    if (
      isFunction(ancestor) &&
      (ancestor.params ?? []).some((param: AnyNode) => hasBindingName(param, node.name))
    ) {
      return true;
    }

    if (ancestor.type === "CatchClause" && hasBindingName(ancestor.param, node.name)) {
      return true;
    }

    if (
      (ancestor.type === "BlockStatement" || ancestor.type === "Program") &&
      hasDeclarationBeforeReference(ancestor.body, node.name, node)
    ) {
      return true;
    }
  }

  return false;
}
