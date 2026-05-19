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

function isRouteType(context: Context, typeNode: AnyNode | null | undefined): boolean {
  return (
    typeNode?.type === "TSTypeReference" &&
    isImportedTypeName(context, typeNode.typeName, ROUTE_TYPE_NAMES)
  );
}

function isRouteArrayType(context: Context, typeNode: AnyNode | null | undefined): boolean {
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

function getTypeAnnotation(node: AnyNode | null | undefined): AnyNode | null {
  const typeAnnotation = node?.typeAnnotation;
  return typeAnnotation?.type === "TSTypeAnnotation" ? typeAnnotation.typeAnnotation : null;
}

const noRouteResolvers = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow Angular route resolvers in typed Route/Routes declarations.",
      recommended: true,
    },
    schema: [],
    messages: {
      noRouteResolvers:
        "Avoid Angular route resolvers for data loading. Prefer component-level loading with signals or server-state helpers.",
    },
  },

  createOnce(context: Context) {
    function reportResolveInRouteObject(routeObject: AnyNode): void {
      for (const property of routeObject.properties ?? []) {
        if (property.type !== "Property" || property.computed) continue;

        const propertyName = getPropertyName(property.key);
        if (propertyName === "resolve") {
          context.report({
            node: property.key ?? property,
            messageId: "noRouteResolvers",
          });
          continue;
        }

        if (propertyName === "children" && property.value?.type === "ArrayExpression") {
          reportResolveInRouteArray(property.value);
        }
      }
    }

    function reportResolveInRouteArray(routeArray: AnyNode): void {
      for (const element of routeArray.elements ?? []) {
        if (element?.type === "ObjectExpression") {
          reportResolveInRouteObject(element);
        }
      }
    }

    return {
      VariableDeclarator(node) {
        const declarator = node as AnyNode;
        const typeNode = getTypeAnnotation(declarator.id);

        if (isRouteArrayType(context, typeNode) && declarator.init?.type === "ArrayExpression") {
          reportResolveInRouteArray(declarator.init);
          return;
        }

        if (isRouteType(context, typeNode) && declarator.init?.type === "ObjectExpression") {
          reportResolveInRouteObject(declarator.init);
        }
      },
    };
  },
}) satisfies Rule;

export default noRouteResolvers;
