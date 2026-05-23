import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName, unwrapExpression } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isImportedReference } from "../../utilities/angular.js";
import { findNearestBindingIdentifier } from "../../utilities/scope.js";
import {
  DEFAULT_TANSTACK_QUERY_SOURCES,
  getTanstackQueryImportName,
  getTanstackQuerySources,
  isTanstackQueryImportedReference,
  QUERY_CORE_SOURCE,
  QUERY_OPTIONS_BUILDERS,
} from "../../utilities/tanstack-query.js";
import type { TanstackQueryRuleOptions } from "../../utilities/tanstack-query.js";

const ANGULAR_CORE_SOURCE = "@angular/core";
const INJECT_NAMES = new Set(["inject"]);
const QUERY_INJECT_APIS = new Set(["injectQuery", "injectInfiniteQuery"]);
const QUERIES_INJECT_APIS = new Set(["injectQueries"]);
const FILTER_INJECT_APIS = new Set(["injectIsFetching"]);
const QUERY_CLIENT_OPTION_METHODS = new Set([
  "ensureInfiniteQueryData",
  "ensureQueryData",
  "fetchInfiniteQuery",
  "fetchQuery",
  "prefetchInfiniteQuery",
  "prefetchQuery",
]);
const QUERY_CLIENT_QUERY_KEY_METHODS = new Set([
  "getQueryData",
  "getQueryDefaults",
  "getQueryState",
  "setQueryData",
  "setQueryDefaults",
]);
const QUERY_CLIENT_FILTER_METHODS = new Set([
  "cancelQueries",
  "getQueriesData",
  "invalidateQueries",
  "isFetching",
  "refetchQueries",
  "removeQueries",
  "resetQueries",
  "setQueriesData",
]);
const QUERY_CLIENT_NAMES = new Set(["QueryClient"]);
const SKIP_TOKEN_NAMES = new Set(["skipToken"]);

function getProperty(node: AnyNode, name: string): AnyNode | null {
  for (const property of node.properties ?? []) {
    if (property.type === "Property" && getPropertyName(property.key) === name) {
      return property;
    }
  }

  return null;
}

function isObjectExpression(node: AnyNode | null | undefined): node is AnyNode {
  return unwrapExpression(node)?.type === "ObjectExpression";
}

function isInlineArrayExpression(node: AnyNode | null | undefined): boolean {
  return unwrapExpression(node)?.type === "ArrayExpression";
}

function isSkipToken(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  if (expression.type === "ConditionalExpression") {
    return (
      isSkipToken(context, expression.consequent, sources) ||
      isSkipToken(context, expression.alternate, sources)
    );
  }

  if (expression.type === "LogicalExpression") {
    return (
      isSkipToken(context, expression.left, sources) ||
      isSkipToken(context, expression.right, sources)
    );
  }

  for (const source of [...sources, QUERY_CORE_SOURCE]) {
    if (isImportedReference(context, expression, source, SKIP_TOKEN_NAMES)) return true;
  }

  return false;
}

function hasObjectSpread(node: AnyNode): boolean {
  return (node.properties ?? []).some((property: AnyNode) => property.type === "SpreadElement");
}

function hasInlineQueryOptions(
  context: Context,
  node: AnyNode,
  sources: ReadonlySet<string>,
): boolean {
  const queryKey = getProperty(node, "queryKey");
  if (queryKey) return true;

  const queryFn = getProperty(node, "queryFn");
  if (!queryFn) return false;

  return !(hasObjectSpread(node) && isSkipToken(context, queryFn.value, sources));
}

function hasInlineFilterQueryKey(node: AnyNode): boolean {
  const queryKey = getProperty(node, "queryKey")?.value;
  return isInlineArrayExpression(queryKey);
}

function getReturnedObjectExpressions(node: AnyNode | null | undefined): AnyNode[] {
  const expression = unwrapExpression(node);
  if (!expression) return [];

  if (expression.type === "ObjectExpression") return [expression];

  if (expression.type === "ArrowFunctionExpression" || expression.type === "FunctionExpression") {
    return getReturnedObjectExpressions(expression.body);
  }

  if (expression.type === "BlockStatement") {
    return (expression.body ?? []).flatMap((statement: AnyNode) =>
      statement.type === "ReturnStatement" ? getReturnedObjectExpressions(statement.argument) : [],
    );
  }

  if (expression.type === "ConditionalExpression") {
    return [
      ...getReturnedObjectExpressions(expression.consequent),
      ...getReturnedObjectExpressions(expression.alternate),
    ];
  }

  if (expression.type === "LogicalExpression") {
    return [
      ...getReturnedObjectExpressions(expression.left),
      ...getReturnedObjectExpressions(expression.right),
    ];
  }

  if (expression.type === "SequenceExpression") {
    return (expression.expressions ?? []).flatMap((child: AnyNode) =>
      getReturnedObjectExpressions(child),
    );
  }

  return [];
}

function getQueryObjects(node: AnyNode | null | undefined): AnyNode[] {
  const expression = unwrapExpression(node);
  if (!expression) return [];

  if (expression.type === "ArrayExpression") {
    return (expression.elements ?? [])
      .filter(isObjectExpression)
      .map((element: AnyNode) => unwrapExpression(element));
  }

  if (
    expression.type === "CallExpression" &&
    expression.callee?.type === "MemberExpression" &&
    getPropertyName(expression.callee.property) === "map"
  ) {
    const mapper = expression.arguments?.[0];
    if (mapper?.type === "ArrowFunctionExpression" || mapper?.type === "FunctionExpression") {
      return getReturnedObjectExpressions(mapper);
    }
  }

  return [];
}

function getBindingInitializer(binding: AnyNode | null): AnyNode | null {
  const parent = binding?.parent;
  if (!parent) return null;

  if (parent.type === "VariableDeclarator" && parent.id === binding) return parent.init ?? null;
  if (parent.type === "AssignmentPattern" && parent.left === binding) return parent.right ?? null;

  return null;
}

function getThisFieldInitializer(
  context: Context,
  node: AnyNode,
  fieldName: string,
): AnyNode | null {
  const ancestors = context.sourceCode.getAncestors(node) as AnyNode[];
  const classBody = ancestors.findLast((ancestor) => ancestor.type === "ClassBody");
  if (!classBody) return null;

  for (const member of classBody.body ?? []) {
    if (getPropertyName(member.key) === fieldName) return member.value ?? null;
  }

  return null;
}

function isQueryClientReference(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  return (
    isTanstackQueryImportedReference(context, expression, sources, QUERY_CLIENT_NAMES) ||
    isImportedReference(context, expression, QUERY_CORE_SOURCE, QUERY_CLIENT_NAMES)
  );
}

function isInjectQueryClientCall(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): boolean {
  const expression = unwrapExpression(node);
  return (
    expression?.type === "CallExpression" &&
    isImportedReference(context, expression.callee, ANGULAR_CORE_SOURCE, INJECT_NAMES) &&
    isQueryClientReference(context, expression.arguments?.[0], sources)
  );
}

function isQueryClientSource(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): boolean {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  if (expression.type === "NewExpression") {
    return isQueryClientReference(context, expression.callee, sources);
  }

  return isInjectQueryClientCall(context, expression, sources);
}

function resolveQueryClientSource(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): AnyNode | null {
  let current = unwrapExpression(node);
  const visited = new Set<AnyNode>();

  while (current && !visited.has(current)) {
    visited.add(current);

    if (isQueryClientSource(context, current, sources)) return current;

    if (current.type === "Identifier") {
      const initializer = getBindingInitializer(findNearestBindingIdentifier(context, current));
      if (!initializer) return current;
      current = unwrapExpression(initializer);
      continue;
    }

    if (current.type === "MemberExpression" && current.object?.type === "ThisExpression") {
      const initializer = getThisFieldInitializer(
        context,
        current,
        getPropertyName(current.property) ?? "",
      );
      if (!initializer) return current;
      current = unwrapExpression(initializer);
      continue;
    }

    return current;
  }

  return current ?? null;
}

function isTanstackQueryClient(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): boolean {
  return isQueryClientSource(context, resolveQueryClientSource(context, node, sources), sources);
}

function reportInlineQueryOptions(
  context: Context,
  node: AnyNode | null | undefined,
  sources: ReadonlySet<string>,
): void {
  const expression = unwrapExpression(node);
  if (!expression || expression.type !== "ObjectExpression") return;
  if (!hasInlineQueryOptions(context, expression, sources)) return;

  context.report({
    node: expression,
    messageId: "preferQueryOptions",
  });
}

function reportInlineFilterQueryKey(context: Context, node: AnyNode | null | undefined): void {
  const expression = unwrapExpression(node);
  if (!expression || expression.type !== "ObjectExpression") return;
  if (!hasInlineFilterQueryKey(expression)) return;

  context.report({
    node: expression,
    messageId: "preferQueryOptionsQueryKey",
  });
}

const tanstackQueryPreferQueryOptions = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Prefer queryOptions() to co-locate TanStack Query queryKey and queryFn.",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          tanstackQuerySources: {
            type: "array",
            items: { type: "string" },
            default: DEFAULT_TANSTACK_QUERY_SOURCES,
          },
        },
      },
    ],
    messages: {
      preferQueryOptions:
        "Prefer using queryOptions() or infiniteQueryOptions() to co-locate queryKey and queryFn.",
      preferQueryOptionsQueryKey:
        "Prefer referencing a queryKey from a queryOptions() result instead of typing it manually.",
    },
  },

  createOnce(context: Context) {
    let tanstackQuerySources = new Set(DEFAULT_TANSTACK_QUERY_SOURCES);

    return {
      before() {
        const options = (context.options?.[0] ?? {}) as TanstackQueryRuleOptions;
        tanstackQuerySources = getTanstackQuerySources(options);
      },

      CallExpression(node) {
        const callNode = node as AnyNode;
        const importName = getTanstackQueryImportName(
          context,
          callNode.callee,
          tanstackQuerySources,
        );

        if (importName && QUERY_OPTIONS_BUILDERS.has(importName)) return;

        if (importName && QUERY_INJECT_APIS.has(importName)) {
          for (const objectExpression of getReturnedObjectExpressions(callNode.arguments?.[0])) {
            reportInlineQueryOptions(context, objectExpression, tanstackQuerySources);
          }
          return;
        }

        if (importName && QUERIES_INJECT_APIS.has(importName)) {
          for (const objectExpression of getReturnedObjectExpressions(callNode.arguments?.[0])) {
            const queries = getProperty(objectExpression, "queries")?.value;
            for (const query of getQueryObjects(queries)) {
              reportInlineQueryOptions(context, query, tanstackQuerySources);
            }
          }
          return;
        }

        if (importName && FILTER_INJECT_APIS.has(importName)) {
          reportInlineFilterQueryKey(context, callNode.arguments?.[0]);
          return;
        }

        const callee = unwrapExpression(callNode.callee);
        if (
          callee?.type !== "MemberExpression" ||
          !isTanstackQueryClient(context, callee.object, tanstackQuerySources)
        ) {
          return;
        }

        const method = getPropertyName(callee.property);
        const options = callNode.arguments?.[0];

        if (QUERY_CLIENT_OPTION_METHODS.has(method ?? "")) {
          reportInlineQueryOptions(context, options, tanstackQuerySources);
          return;
        }

        if (QUERY_CLIENT_QUERY_KEY_METHODS.has(method ?? "") && isInlineArrayExpression(options)) {
          context.report({
            node: unwrapExpression(options) ?? options,
            messageId: "preferQueryOptionsQueryKey",
          });
          return;
        }

        if (QUERY_CLIENT_FILTER_METHODS.has(method ?? "")) {
          reportInlineFilterQueryKey(context, options);
        }
      },
    };
  },
}) satisfies Rule;

export default tanstackQueryPreferQueryOptions;
