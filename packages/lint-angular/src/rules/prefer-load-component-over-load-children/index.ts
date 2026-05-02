import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, getTypeName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";

interface AngularRouterTypeImports {
  routeTypeLocalNames: Set<string>;
  routesTypeLocalNames: Set<string>;
  routerNamespaces: Set<string>;
}

function isImportedTypeName(
  typeNode: AnyNode | null | undefined,
  localNames: Set<string>,
  routerNamespaces: Set<string>,
): boolean {
  const typeName = getTypeName(typeNode);
  if (!typeName) return false;
  if (!typeName.includes(".")) return localNames.has(typeName);

  const [namespaceName, memberName] = typeName.split(".");
  return routerNamespaces.has(namespaceName) && localNames.has(memberName);
}

function getTypeParameterNodes(typeNode: AnyNode): AnyNode[] {
  return typeNode.typeParameters?.params ?? typeNode.typeArguments?.params ?? [];
}

function isRouteType(typeNode: AnyNode | null | undefined, imports: AngularRouterTypeImports) {
  return (
    typeNode?.type === "TSTypeReference" &&
    isImportedTypeName(typeNode.typeName, imports.routeTypeLocalNames, imports.routerNamespaces)
  );
}

function isRouteArrayType(typeNode: AnyNode | null | undefined, imports: AngularRouterTypeImports) {
  if (!typeNode) return false;

  if (
    typeNode.type === "TSTypeReference" &&
    isImportedTypeName(typeNode.typeName, imports.routesTypeLocalNames, imports.routerNamespaces)
  ) {
    return true;
  }

  if (typeNode.type === "TSArrayType") {
    return isRouteType(typeNode.elementType, imports);
  }

  if (typeNode.type !== "TSTypeReference") return false;

  const typeName = getTypeName(typeNode.typeName);
  if (typeName !== "Array" && typeName !== "ReadonlyArray") return false;
  const [elementType] = getTypeParameterNodes(typeNode);
  return isRouteType(elementType, imports);
}

function isRoutesTypeAnnotation(
  node: AnyNode | null | undefined,
  imports: AngularRouterTypeImports,
): boolean {
  const typeAnnotation = node?.typeAnnotation;
  if (!typeAnnotation || typeAnnotation.type !== "TSTypeAnnotation") return false;
  return isRouteArrayType(typeAnnotation.typeAnnotation, imports);
}

function isExportedConstDeclarator(node: AnyNode): boolean {
  if (node.type !== "VariableDeclarator") return false;
  const declaration = node.parent as AnyNode | undefined;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return false;
  const exportDeclaration = declaration.parent as AnyNode | undefined;
  return exportDeclaration?.type === "ExportNamedDeclaration";
}

const preferLoadComponentOverLoadChildren = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Prefer lazy loading route components with loadComponent and disallow loadChildren in exported Routes arrays.",
      recommended: true,
    },
    schema: [],
    messages: {
      avoidLoadChildren:
        "Avoid loadChildren in Routes arrays; prefer loadComponent for lazy-loading standalone route components.",
    },
  },

  createOnce(context: Context) {
    const imports: AngularRouterTypeImports = {
      routeTypeLocalNames: new Set<string>(),
      routesTypeLocalNames: new Set<string>(),
      routerNamespaces: new Set<string>(),
    };

    function reportLoadChildrenInRouteObject(routeObject: AnyNode): void {
      for (const property of routeObject.properties ?? []) {
        if (property.type !== "Property" || property.computed) continue;

        const propertyName = getPropertyName(property.key);
        if (propertyName === "loadChildren") {
          context.report({
            node: property.key ?? property,
            messageId: "avoidLoadChildren",
          });
          continue;
        }

        if (propertyName === "children" && property.value?.type === "ArrayExpression") {
          reportLoadChildrenInRouteArray(property.value);
        }
      }
    }

    function reportLoadChildrenInRouteArray(routeArray: AnyNode): void {
      for (const element of routeArray.elements ?? []) {
        if (element?.type === "ObjectExpression") {
          reportLoadChildrenInRouteObject(element);
        }
      }
    }

    return {
      before() {
        imports.routeTypeLocalNames.clear();
        imports.routesTypeLocalNames.clear();
        imports.routerNamespaces.clear();
      },

      ImportDeclaration(node) {
        if (node.source?.value !== "@angular/router") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier") {
            const importedName = getPropertyName(specifier.imported as AnyNode);
            if (importedName === "Route") imports.routeTypeLocalNames.add(specifier.local.name);
            if (importedName === "Routes") imports.routesTypeLocalNames.add(specifier.local.name);
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            imports.routerNamespaces.add(specifier.local.name);
            imports.routeTypeLocalNames.add("Route");
            imports.routesTypeLocalNames.add("Routes");
          }
        }
      },

      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        if (!isExportedConstDeclarator(declarator)) return;
        if (declarator.id?.type !== "Identifier") return;
        if (!isRoutesTypeAnnotation(declarator.id, imports)) return;
        if (declarator.init?.type !== "ArrayExpression") return;

        reportLoadChildrenInRouteArray(declarator.init);
      },
    };
  },
}) satisfies Rule;

export default preferLoadComponentOverLoadChildren;
