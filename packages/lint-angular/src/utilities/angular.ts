import type { Context } from "@oxlint/plugins";
import { getPropertyName } from "./ast.js";
import type { AnyNode } from "./ast.js";
import { isShadowedIdentifier } from "./scope.js";

export interface AngularCoreDecoratorImports {
  decoratorNames: Set<string>;
  decoratorLocalNames: Set<string>;
  angularNamespaces: Set<string>;
}

export function addAngularCoreDecoratorImport(
  specifier: AnyNode,
  decoratorNames: Set<string>,
  imports: AngularCoreDecoratorImports,
) {
  if (specifier.type === "ImportSpecifier") {
    const importedName = getPropertyName(specifier.imported as AnyNode);
    if (importedName && decoratorNames.has(importedName)) {
      imports.decoratorLocalNames.add(specifier.local.name);
    }
  }

  if (specifier.type === "ImportNamespaceSpecifier") {
    imports.angularNamespaces.add(specifier.local.name);
  }
}

export function isAngularCoreDecorator(
  context: Context,
  decorator: AnyNode | null | undefined,
  imports: AngularCoreDecoratorImports,
): boolean {
  if (!decorator) return false;

  const expression = decorator.expression ?? decorator;
  const callee = expression?.type === "CallExpression" ? expression.callee : expression;

  if (callee?.type === "Identifier") {
    return imports.decoratorLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee);
  }

  return (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "Identifier" &&
    imports.angularNamespaces.has(callee.object.name) &&
    !isShadowedIdentifier(context, callee.object) &&
    imports.decoratorNames.has(getPropertyName(callee.property) ?? "")
  );
}
