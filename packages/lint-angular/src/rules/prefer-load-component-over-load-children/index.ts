import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { getImportedName, isNamespaceImport } from "../../utilities/angular.js";

const ROUTE_TYPE_NAMES = new Set(["Route"]);
const ROUTES_TYPE_NAMES = new Set(["Routes"]);

function isImportedTypeName(
  context: Context,
  typeNode: AnyNode | null | undefined,
  importedNames: Set<string>,
): boolean {
  if (typeNode?.type === "Identifier") {
    const importedName = getImportedName(context, typeNode, "@angular/router");
    return !!importedName && importedNames.has(importedName);
  }

  return (
    typeNode?.type === "TSQualifiedName" &&
    typeNode.left?.type === "Identifier" &&
    isNamespaceImport(context, typeNode.left, "@angular/router") &&
    importedNames.has(getPropertyName(typeNode.right) ?? "")
  );
}

function getTypeParameterNodes(typeNode: AnyNode): AnyNode[] {
  return typeNode.typeParameters?.params ?? typeNode.typeArguments?.params ?? [];
}

function isRouteType(context: Context, typeNode: AnyNode | null | undefined) {
  return (
    typeNode?.type === "TSTypeReference" &&
    isImportedTypeName(context, typeNode.typeName, ROUTE_TYPE_NAMES)
  );
}

function isRouteArrayType(context: Context, typeNode: AnyNode | null | undefined) {
  if (!typeNode) return false;

  if (
    typeNode.type === "TSTypeReference" &&
    isImportedTypeName(context, typeNode.typeName, ROUTES_TYPE_NAMES)
  ) {
    return true;
  }

  if (typeNode.type === "TSArrayType") {
    return isRouteType(context, typeNode.elementType);
  }

  if (typeNode.type !== "TSTypeReference") return false;

  if (
    getPropertyName(typeNode.typeName) !== "Array" &&
    getPropertyName(typeNode.typeName) !== "ReadonlyArray"
  ) {
    return false;
  }
  const [elementType] = getTypeParameterNodes(typeNode);
  return isRouteType(context, elementType);
}

function isRoutesTypeAnnotation(context: Context, node: AnyNode | null | undefined): boolean {
  const typeAnnotation = node?.typeAnnotation;
  if (!typeAnnotation || typeAnnotation.type !== "TSTypeAnnotation") return false;
  return isRouteArrayType(context, typeAnnotation.typeAnnotation);
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
      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        if (!isExportedConstDeclarator(declarator)) return;
        if (declarator.id?.type !== "Identifier") return;
        if (!isRoutesTypeAnnotation(context, declarator.id)) return;
        if (declarator.init?.type !== "ArrayExpression") return;

        reportLoadChildrenInRouteArray(declarator.init);
      },
    };
  },
}) satisfies Rule;

export default preferLoadComponentOverLoadChildren;
