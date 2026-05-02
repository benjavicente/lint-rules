import type { Node } from "@oxlint/plugins";

export type AnyNode = Node & Record<string, any>;

export function getPropertyName(node: AnyNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "PrivateIdentifier") return node.name;
  if (node.type === "Literal") return String(node.value);
  if (node.type === "StringLiteral") return String(node.value);
  return null;
}

export function getDecoratorName(decoratorNode: AnyNode | null | undefined): string | null {
  if (!decoratorNode) return null;

  const expression = decoratorNode.expression ?? decoratorNode;
  const callee = expression?.type === "CallExpression" ? expression.callee : expression;
  if (!callee) return null;

  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression") return getPropertyName(callee.property);

  return null;
}

export function getRange(node: AnyNode | null | undefined): [number, number] | null {
  if (!node) return null;
  if (Array.isArray(node.range) && typeof node.range[0] === "number") {
    return [node.range[0], node.range[1]];
  }
  if (typeof node.start === "number" && typeof node.end === "number") {
    return [node.start, node.end];
  }
  return null;
}

export function getNodeStart(node: AnyNode): number | null {
  if (typeof node.start === "number") return node.start;
  if (Array.isArray(node.range) && typeof node.range[0] === "number") return node.range[0];
  return null;
}

export function getTypeName(node: AnyNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "TSTypeReference") return getTypeName(node.typeName);
  if (node.type === "TSQualifiedName") {
    const left = getTypeName(node.left);
    const right = getTypeName(node.right);
    return left && right ? `${left}.${right}` : (right ?? left);
  }
  return null;
}

const TRANSPARENT_EXPRESSION_NODE_TYPES = new Set([
  "ChainExpression",
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSInstantiationExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

export function unwrapExpression(node: AnyNode | null | undefined): AnyNode | null {
  let current = node;
  while (current && TRANSPARENT_EXPRESSION_NODE_TYPES.has(current.type)) {
    current =
      current.expression ??
      current.argument ??
      current.object ??
      current.callee ??
      current.typeAnnotation ??
      null;
  }
  return current ?? null;
}
