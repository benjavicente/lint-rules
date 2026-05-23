import type { Context } from "@oxlint/plugins";
import { getPropertyName, unwrapExpression } from "./ast.js";
import type { AnyNode } from "./ast.js";
import { getImportedName, isImportedReference, isNamespaceImport } from "./angular.js";

export type TanstackQueryRuleOptions = {
  tanstackQuerySources?: string[];
};

export const DEFAULT_TANSTACK_QUERY_SOURCES = [
  "@tanstack/angular-query",
  "@benjavicente/angular-query",
  "@tanstack/angular-query-experimental",
];

export const QUERY_CORE_SOURCE = "@tanstack/query-core";
export const QUERY_OPTIONS_BUILDERS = new Set(["queryOptions", "infiniteQueryOptions"]);

export function getTanstackQuerySources(options: TanstackQueryRuleOptions): Set<string> {
  return new Set(options.tanstackQuerySources ?? DEFAULT_TANSTACK_QUERY_SOURCES);
}

export function getTanstackQueryImportName(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): string | null {
  const expression = unwrapExpression(node);

  if (expression?.type === "Identifier") {
    for (const source of sources) {
      const importedName = getImportedName(context, expression, source);
      if (importedName) return importedName;
    }
    return null;
  }

  if (expression?.type !== "MemberExpression" || expression.object?.type !== "Identifier") {
    return null;
  }

  for (const source of sources) {
    if (isNamespaceImport(context, expression.object, source)) {
      return getPropertyName(expression.property);
    }
  }

  return null;
}

export function isTanstackQueryImportedReference(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
  names: ReadonlySet<string>,
): boolean {
  for (const source of sources) {
    if (isImportedReference(context, node, source, names)) return true;
  }

  return false;
}
