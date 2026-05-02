import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import {
  getDecoratorName,
  getNodeStart,
  getPropertyName,
  getTypeName,
} from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isShadowedIdentifier } from "../../utilities/scope.js";

interface RuleOptions {
  allowedFunctionNames?: string[];
  checkUnimportedInject?: boolean;
  injectFunctionPrefixes?: string[];
  injectFunctionSuffixes?: string[];
  runsInInjectionContext?: Array<{
    from: string;
    imports: string[] | "all";
  }>;
}

interface InjectionContextApiImports {
  from: string;
  imports: string[];
}

const DEFAULT_ALLOWED_FUNCTION_NAMES: string[] = [];
const DEFAULT_INJECT_FUNCTION_PREFIXES = ["injext"];
const DEFAULT_INJECT_FUNCTION_SUFFIXES = ["Guard"];
const DEFAULT_RUNS_IN_INJECTION_CONTEXT: Array<{
  from: string;
  imports: string[] | "all";
}> = [];

const ROUTER_CONTEXT_PROPERTY_NAMES = new Set([
  "loadChildren",
  "loadComponent",
  "canActivate",
  "canActivateChild",
  "canDeactivate",
  "canMatch",
  "canLoad",
  "redirectTo",
  "resolve",
  "title",
]);

const ANGULAR_CLASS_DECORATOR_NAMES = new Set([
  "Component",
  "Directive",
  "Injectable",
  "Service",
  "Pipe",
  "NgModule",
]);

const INJECTION_CONTEXT_RUNNER_NAMES = new Set(["runInInjectionContext", "runInContext"]);
const KNOWN_INJECTION_CONTEXT_API_IMPORTS: InjectionContextApiImports[] = [
  {
    from: "@angular/core",
    imports: [
      "afterEveryRender",
      "afterNextRender",
      "afterRender",
      "afterRenderEffect",
      "assertInInjectionContext",
      "effect",
      "inject",
      "resource",
    ],
  },
  {
    from: "@angular/core/rxjs-interop",
    imports: ["rxResource", "toObservable", "toSignal"],
  },
  { from: "@angular/common/http", imports: ["httpResource"] },
  { from: "@angular/forms/signals", imports: ["form"] },
];

const INJECTION_CONTEXT_FUNCTION_TYPE_NAMES = new Set([
  "CanActivateFn",
  "CanActivateChildFn",
  "CanDeactivateFn",
  "CanLoadFn",
  "CanMatchFn",
  "HttpInterceptorFn",
  "RedirectFunction",
  "ResolveFn",
]);

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const CLASS_FIELD_TYPES = new Set(["AccessorProperty", "FieldDefinition", "PropertyDefinition"]);

function isFunction(node: AnyNode | null | undefined): boolean {
  return !!node && FUNCTION_TYPES.has(node.type);
}

function getAncestors(context: Context, node: AnyNode): AnyNode[] {
  return context.sourceCode.getAncestors(node) as AnyNode[];
}

function isPropertyValueFunction(functionNode: AnyNode, propertyNames: Set<string>): boolean {
  const parent = functionNode.parent;
  return (
    parent?.type === "Property" &&
    parent.value === functionNode &&
    propertyNames.has(getPropertyName(parent.key) ?? "")
  );
}

function isRunInInjectionContextCallback(functionNode: AnyNode): boolean {
  const parent = functionNode.parent;
  if (parent?.type !== "CallExpression") return false;
  if (!parent.arguments?.includes(functionNode)) return false;

  const callee = parent.callee;
  if (callee?.type === "Identifier") {
    return INJECTION_CONTEXT_RUNNER_NAMES.has(callee.name);
  }

  return (
    callee?.type === "MemberExpression" &&
    INJECTION_CONTEXT_RUNNER_NAMES.has(getPropertyName(callee.property) ?? "")
  );
}

function isNestedInPropertyValue(functionNode: AnyNode, propertyNames: Set<string>): boolean {
  let current: AnyNode | null | undefined = functionNode.parent;
  while (current) {
    if (current.type === "Property" && propertyNames.has(getPropertyName(current.key) ?? "")) {
      return true;
    }

    if (isFunction(current)) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function getFunctionName(functionNode: AnyNode): string | null {
  const parent = skipTransparentExpressionParents(functionNode.parent);

  if (functionNode.type === "FunctionDeclaration") {
    return functionNode.id?.name ?? null;
  }

  if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
    return parent.id.name;
  }
  if (parent?.type === "Property" && parent.value === functionNode) {
    return getPropertyName(parent.key);
  }
  if (parent?.type === "MethodDefinition" && parent.value === functionNode) {
    return getPropertyName(parent.key);
  }

  return null;
}

function skipTransparentExpressionParents(node: AnyNode | null | undefined): AnyNode | null {
  let current = node;
  while (
    current?.type === "ParenthesizedExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "TSNonNullExpression"
  ) {
    current = current.parent;
  }

  return current ?? null;
}

function getTransparentExpressionTypeName(functionNode: AnyNode): string | null {
  let current = functionNode.parent;
  while (
    current?.type === "ParenthesizedExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "TSNonNullExpression"
  ) {
    if (current.type === "TSAsExpression" || current.type === "TSSatisfiesExpression") {
      const typeName = getTypeName(current.typeAnnotation);
      if (typeName) return typeName;
    }

    current = current.parent;
  }

  return null;
}

function getFunctionContextTypeName(functionNode: AnyNode): string | null {
  const transparentTypeName = getTransparentExpressionTypeName(functionNode);
  if (transparentTypeName) return transparentTypeName;

  const parent = skipTransparentExpressionParents(functionNode.parent);

  if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
    return getTypeName(parent.id.typeAnnotation?.typeAnnotation);
  }

  if (parent?.type === "Property" && parent.value === functionNode) {
    return getTypeName(parent.typeAnnotation?.typeAnnotation);
  }

  if (parent && CLASS_FIELD_TYPES.has(parent.type) && parent.value === functionNode) {
    return getTypeName(parent.typeAnnotation?.typeAnnotation);
  }

  return null;
}

function isTypedInjectionContextFunction(functionNode: AnyNode): boolean {
  const typeName = getFunctionContextTypeName(functionNode);
  if (!typeName) return false;

  const unqualifiedTypeName = typeName.includes(".") ? typeName.split(".").at(-1) : typeName;
  return INJECTION_CONTEXT_FUNCTION_TYPE_NAMES.has(unqualifiedTypeName ?? typeName);
}

function hasAwaitBeforeNodeInFunction(functionNode: AnyNode, node: AnyNode): boolean {
  const nodeStart = getNodeStart(node);
  if (nodeStart === null) return false;
  const targetStart = nodeStart;

  function visit(current: AnyNode | AnyNode[] | null | undefined): boolean {
    if (!current) return false;

    if (Array.isArray(current)) {
      return current.some(visit);
    }

    if (current !== functionNode && isFunction(current)) {
      return false;
    }

    if (current.type === "AwaitExpression") {
      const awaitStart = getNodeStart(current);
      return awaitStart !== null && awaitStart < targetStart;
    }

    for (const [key, value] of Object.entries(current)) {
      if (key === "parent") continue;
      if (!value || typeof value !== "object") continue;
      if (visit(value as AnyNode | AnyNode[])) return true;
    }

    return false;
  }

  return visit(functionNode.body);
}

function isConstructorFunction(functionNode: AnyNode): boolean {
  return (
    functionNode.parent?.type === "MethodDefinition" &&
    functionNode.parent.kind === "constructor" &&
    functionNode.parent.value === functionNode
  );
}

function isDirectClassFieldInitializer(
  ancestors: AnyNode[],
  nearestFunction: AnyNode | undefined,
): boolean {
  const classField = ancestors.findLast((ancestor) => CLASS_FIELD_TYPES.has(ancestor.type));
  return !!classField && !nearestFunction;
}

function hasSupportedAngularClassDecorator(classNode: AnyNode | undefined): boolean {
  if (!classNode) return false;
  if (!Array.isArray(classNode.decorators)) return false;

  return classNode.decorators.some((decorator: AnyNode) =>
    ANGULAR_CLASS_DECORATOR_NAMES.has(getDecoratorName(decorator) ?? ""),
  );
}

function isAllowedInjectionContext(
  context: Context,
  node: AnyNode,
  allowedFunctionNames: Set<string>,
  injectFunctionPrefixes: string[],
  injectFunctionSuffixes: string[],
): boolean {
  const ancestors = getAncestors(context, node);
  const nearestFunction = ancestors.findLast(isFunction);
  const enclosingClass = ancestors.findLast(
    (ancestor) => ancestor.type === "ClassDeclaration" || ancestor.type === "ClassExpression",
  );

  if (nearestFunction && hasAwaitBeforeNodeInFunction(nearestFunction, node)) {
    return false;
  }

  if (
    isDirectClassFieldInitializer(ancestors, nearestFunction) &&
    hasSupportedAngularClassDecorator(enclosingClass)
  ) {
    return true;
  }

  if (!nearestFunction) {
    return false;
  }

  if (isConstructorFunction(nearestFunction) && hasSupportedAngularClassDecorator(enclosingClass)) {
    return true;
  }

  if (isPropertyValueFunction(nearestFunction, new Set(["useFactory", "factory"]))) {
    return true;
  }

  if (isRunInInjectionContextCallback(nearestFunction)) {
    return true;
  }

  if (isTypedInjectionContextFunction(nearestFunction)) {
    return true;
  }

  if (isNestedInPropertyValue(nearestFunction, ROUTER_CONTEXT_PROPERTY_NAMES)) {
    return true;
  }

  const functionName = getFunctionName(nearestFunction);
  return functionName
    ? allowedFunctionNames.has(functionName) ||
        injectFunctionPrefixes.some((prefix) => functionName.startsWith(prefix)) ||
        injectFunctionSuffixes.some((suffix) => functionName.endsWith(suffix))
    : false;
}

function getKnownInjectionContextApiImports(source: string): Set<string> | null {
  const apiImports = KNOWN_INJECTION_CONTEXT_API_IMPORTS.find((entry) => entry.from === source);
  return apiImports ? new Set(apiImports.imports) : null;
}

function isKnownInjectionContextApiCall(
  context: Context,
  node: AnyNode,
  injectionContextApiLocalNames: Set<string>,
  injectionContextApiNamespaceMembers: Map<string, Set<string>>,
  checkUnimportedInject: boolean,
): boolean {
  const callee = node.callee;
  if (callee?.type === "Identifier") {
    return (
      (injectionContextApiLocalNames.has(callee.name) && !isShadowedIdentifier(context, callee)) ||
      (checkUnimportedInject && callee.name === "inject" && !isShadowedIdentifier(context, callee))
    );
  }

  if (callee?.type !== "MemberExpression") {
    return false;
  }

  if (callee.object?.type === "Identifier") {
    if (
      injectionContextApiLocalNames.has(callee.object.name) &&
      !isShadowedIdentifier(context, callee.object)
    ) {
      return true;
    }

    const namespaceMembers = injectionContextApiNamespaceMembers.get(callee.object.name);
    return (
      !!namespaceMembers?.has(getPropertyName(callee.property) ?? "") &&
      !isShadowedIdentifier(context, callee.object)
    );
  }

  if (callee.object?.type === "MemberExpression" && callee.object.object?.type === "Identifier") {
    const namespaceMembers = injectionContextApiNamespaceMembers.get(callee.object.object.name);
    return (
      !!namespaceMembers?.has(getPropertyName(callee.object.property) ?? "") &&
      !isShadowedIdentifier(context, callee.object.object)
    );
  }

  return false;
}

function isInjectLikeHelperCall(
  context: Context,
  node: AnyNode,
  injectionContextApiLocalNames: Set<string>,
  injectFunctionPrefixes: string[],
  injectFunctionSuffixes: string[],
  runsInInjectionContextFunctionNames: Set<string>,
): boolean {
  const callee = node.callee;
  if (callee?.type !== "Identifier") return false;
  if (isShadowedIdentifier(context, callee)) return false;
  if (runsInInjectionContextFunctionNames.has(callee.name)) return true;

  return (
    !injectionContextApiLocalNames.has(callee.name) &&
    callee.name !== "inject" &&
    (injectFunctionPrefixes.some((prefix) => callee.name.startsWith(prefix)) ||
      injectFunctionSuffixes.some((suffix) => callee.name.endsWith(suffix)))
  );
}

const rulesOfInject = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Angular APIs that depend on injection context to appear only in known injection contexts.",
      recommended: true,
    },

    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedFunctionNames: {
            type: "array",
            items: { type: "string" },
            default: DEFAULT_ALLOWED_FUNCTION_NAMES,
          },
          checkUnimportedInject: {
            type: "boolean",
            default: false,
          },
          injectFunctionPrefixes: {
            type: "array",
            items: { type: "string" },
            default: DEFAULT_INJECT_FUNCTION_PREFIXES,
          },
          injectFunctionSuffixes: {
            type: "array",
            items: { type: "string" },
            default: DEFAULT_INJECT_FUNCTION_SUFFIXES,
          },
          runsInInjectionContext: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["from", "imports"],
              properties: {
                from: { type: "string" },
                imports: {
                  anyOf: [{ const: "all" }, { type: "array", items: { type: "string" } }],
                },
              },
            },
            default: DEFAULT_RUNS_IN_INJECTION_CONTEXT,
          },
        },
      },
    ],
    messages: {
      disallowedInject:
        "Angular APIs that depend on injection context must be called from an injection context: a class field initializer or constructor in an Angular-decorated class, provider factory, InjectionToken factory, runInInjectionContext/runInContext callback, Angular route callback property (for example loadComponent/canActivate), an inject* or *Guard function, or configured allowed function.",
    },
  },

  createOnce(context) {
    const injectionContextApiLocalNames = new Set<string>();
    const injectionContextApiNamespaceMembers = new Map<string, Set<string>>();
    const runsInInjectionContextFunctionNames = new Set<string>();
    let runsInInjectionContextRules: Array<{ from: string; imports: string[] | "all" }> = [];

    return {
      before() {
        injectionContextApiLocalNames.clear();
        injectionContextApiNamespaceMembers.clear();
        runsInInjectionContextFunctionNames.clear();
        const options = (context.options[0] ?? {}) as RuleOptions;
        runsInInjectionContextRules =
          options.runsInInjectionContext ?? DEFAULT_RUNS_IN_INJECTION_CONTEXT;
      },

      ImportDeclaration(node) {
        const source = node.source?.value;
        const matchingRule =
          typeof source === "string"
            ? runsInInjectionContextRules.find((rule) => rule.from === source)
            : null;

        if (matchingRule) {
          for (const specifier of node.specifiers ?? []) {
            if (
              specifier.type === "ImportSpecifier" &&
              (matchingRule.imports === "all" ||
                matchingRule.imports.includes(getPropertyName(specifier.imported as AnyNode) ?? ""))
            ) {
              runsInInjectionContextFunctionNames.add(specifier.local.name);
            }

            if (
              (specifier.type === "ImportDefaultSpecifier" ||
                specifier.type === "ImportNamespaceSpecifier") &&
              matchingRule.imports === "all"
            ) {
              runsInInjectionContextFunctionNames.add(specifier.local.name);
            }
          }
        }

        const knownApiImports =
          typeof source === "string" ? getKnownInjectionContextApiImports(source) : null;

        if (knownApiImports) {
          for (const specifier of node.specifiers ?? []) {
            if (
              specifier.type === "ImportSpecifier" &&
              knownApiImports.has(getPropertyName(specifier.imported as AnyNode) ?? "")
            ) {
              injectionContextApiLocalNames.add(specifier.local.name);
            }

            if (specifier.type === "ImportNamespaceSpecifier") {
              injectionContextApiNamespaceMembers.set(specifier.local.name, knownApiImports);
            }
          }
        }
      },

      CallExpression(node) {
        const options = (context.options[0] ?? {}) as RuleOptions;
        const allowedFunctionNames = new Set(
          options.allowedFunctionNames ?? DEFAULT_ALLOWED_FUNCTION_NAMES,
        );
        const checkUnimportedInject = options.checkUnimportedInject ?? false;
        const injectFunctionPrefixes =
          options.injectFunctionPrefixes ?? DEFAULT_INJECT_FUNCTION_PREFIXES;
        const injectFunctionSuffixes =
          options.injectFunctionSuffixes ?? DEFAULT_INJECT_FUNCTION_SUFFIXES;
        const inAllowedContext = isAllowedInjectionContext(
          context,
          node as AnyNode,
          allowedFunctionNames,
          injectFunctionPrefixes,
          injectFunctionSuffixes,
        );

        if (
          isInjectLikeHelperCall(
            context,
            node as AnyNode,
            injectionContextApiLocalNames,
            injectFunctionPrefixes,
            injectFunctionSuffixes,
            runsInInjectionContextFunctionNames,
          ) &&
          !inAllowedContext
        ) {
          context.report({
            node: (node as AnyNode).callee,
            messageId: "disallowedInject",
          });
          return;
        }

        if (
          !isKnownInjectionContextApiCall(
            context,
            node as AnyNode,
            injectionContextApiLocalNames,
            injectionContextApiNamespaceMembers,
            checkUnimportedInject,
          )
        ) {
          return;
        }

        if (inAllowedContext) {
          return;
        }

        context.report({
          node: (node as AnyNode).callee,
          messageId: "disallowedInject",
        });
      },
    };
  },
}) satisfies Rule;

export default rulesOfInject;
