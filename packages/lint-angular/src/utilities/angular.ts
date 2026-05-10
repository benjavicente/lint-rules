import type { Context } from "@oxlint/plugins";
import { getPropertyName } from "./ast.js";
import type { AnyNode } from "./ast.js";
import { isShadowedIdentifier } from "./scope.js";

function getProgramNode(context: Context, node: AnyNode): AnyNode | null {
  if (node.type === "Program") return node;

  const ancestors = context.sourceCode.getAncestors(node) as AnyNode[];
  return ancestors.find((ancestor) => ancestor.type === "Program") ?? null;
}

export function getImportedName(
  context: Context,
  node: AnyNode | null | undefined,
  source: string,
): string | null {
  if (node?.type !== "Identifier") return null;
  if (isShadowedIdentifier(context, node)) return null;

  const program = getProgramNode(context, node);
  for (const statement of program?.body ?? []) {
    if (statement.type !== "ImportDeclaration" || statement.source?.value !== source) continue;

    for (const specifier of statement.specifiers ?? []) {
      if (specifier.type !== "ImportSpecifier" || specifier.local.name !== node.name) continue;

      return getPropertyName(specifier.imported as AnyNode);
    }
  }

  return null;
}

export function isNamespaceImport(
  context: Context,
  node: AnyNode | null | undefined,
  source: string,
): boolean {
  if (node?.type !== "Identifier") return false;
  if (isShadowedIdentifier(context, node)) return false;

  const program = getProgramNode(context, node);
  for (const statement of program?.body ?? []) {
    if (statement.type !== "ImportDeclaration" || statement.source?.value !== source) continue;

    if (
      (statement.specifiers ?? []).some(
        (specifier: AnyNode) =>
          specifier.type === "ImportNamespaceSpecifier" && specifier.local.name === node.name,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function isImportedReference(
  context: Context,
  node: AnyNode | null | undefined,
  source: string,
  importedNames: ReadonlySet<string>,
): boolean {
  const importedName = getImportedName(context, node, source);
  return !!importedName && importedNames.has(importedName);
}

export function isImportedNamespaceMember(
  context: Context,
  node: AnyNode | null | undefined,
  source: string,
  memberNames: ReadonlySet<string>,
): boolean {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    isNamespaceImport(context, node.object, source) &&
    memberNames.has(getPropertyName(node.property) ?? "")
  );
}

export function isAngularCoreDecorator(
  context: Context,
  decorator: AnyNode | null | undefined,
  decoratorNames: ReadonlySet<string>,
): boolean {
  if (!decorator) return false;

  const expression = decorator.expression ?? decorator;
  const callee = expression?.type === "CallExpression" ? expression.callee : expression;

  return (
    isImportedReference(context, callee, "@angular/core", decoratorNames) ||
    isImportedNamespaceMember(context, callee, "@angular/core", decoratorNames)
  );
}
