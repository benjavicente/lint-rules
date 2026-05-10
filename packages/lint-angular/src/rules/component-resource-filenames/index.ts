import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import { getPropertyName } from "../../utilities/ast.js";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";

const COMPONENT_DECORATORS = new Set(["Component"]);
const STYLE_EXTENSIONS = new Set(["css", "less", "sass", "scss"]);

interface StaticString {
  value: string;
}

function getExpectedStem(filename: string): string | null {
  const base = filename.split(/[/\\]/u).at(-1) ?? "";
  if (!base.endsWith(".ts")) return null;
  return base.slice(0, -".ts".length);
}

function normalizeResourcePath(value: string): string {
  return value.startsWith("./") ? value.slice(2) : value;
}

function getResourceBasename(value: string): string {
  return normalizeResourcePath(value).split(/[/\\]/u).at(-1) ?? value;
}

function getExtension(value: string): string | null {
  const basename = getResourceBasename(value);
  const index = basename.lastIndexOf(".");
  return index === -1 ? null : basename.slice(index + 1);
}

function getStaticString(node: AnyNode | null | undefined): StaticString | null {
  if (!node) return null;

  if (node.type === "Literal" || node.type === "StringLiteral") {
    if (typeof node.value !== "string") return null;
    return {
      value: node.value,
    };
  }

  if (node.type === "TemplateLiteral" && node.expressions?.length === 0) {
    return {
      value: node.quasis?.[0]?.value?.cooked ?? node.quasis?.[0]?.value?.raw ?? "",
    };
  }

  return null;
}

function getComponentMetadata(context: Context, node: AnyNode): AnyNode | null {
  if (node.type !== "Decorator") return null;
  if (!isAngularCoreDecorator(context, node, COMPONENT_DECORATORS)) return null;

  const expression = node.expression;
  if (expression?.type !== "CallExpression") return null;
  const metadata = expression.arguments?.[0];
  return metadata?.type === "ObjectExpression" ? metadata : null;
}

const componentResourceFilenames = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Angular component templateUrl and styleUrl resource filenames to match the component TypeScript filename.",
      recommended: true,
    },
    schema: [],
    messages: {
      templateUrlMismatch:
        "Component templateUrl should be '{{expected}}' to match this component filename.",
      styleUrlMismatch:
        "Component style URL should be '{{expected}}' to match this component filename.",
      unsupportedStyleExtension:
        "Component style URL should use one of: .css, .less, .sass, or .scss.",
    },
  },

  createOnce(context: Context) {
    let expectedStem: string | null = null;

    function reportTemplateUrl(valueNode: AnyNode): void {
      if (!expectedStem) return;

      const staticString = getStaticString(valueNode);
      if (!staticString) return;

      const expected = `./${expectedStem}.html`;
      if (normalizeResourcePath(staticString.value) === `${expectedStem}.html`) return;

      context.report({
        node: valueNode,
        messageId: "templateUrlMismatch",
        data: { expected },
      });
    }

    function reportStyleUrl(valueNode: AnyNode): void {
      if (!expectedStem) return;

      const staticString = getStaticString(valueNode);
      if (!staticString) return;

      const extension = getExtension(staticString.value);
      if (!extension || !STYLE_EXTENSIONS.has(extension)) {
        context.report({
          node: valueNode,
          messageId: "unsupportedStyleExtension",
        });
        return;
      }

      const expected = `./${expectedStem}.${extension}`;
      if (normalizeResourcePath(staticString.value) === `${expectedStem}.${extension}`) return;

      context.report({
        node: valueNode,
        messageId: "styleUrlMismatch",
        data: { expected },
      });
    }

    return {
      before() {
        expectedStem = getExpectedStem(context.filename ?? "");
        if (!expectedStem) return false;
      },

      Decorator(node) {
        const metadata = getComponentMetadata(context, node as AnyNode);
        if (!metadata) return;

        for (const property of metadata.properties ?? []) {
          if (property.type !== "Property" || property.computed) continue;

          const propertyName = getPropertyName(property.key);
          if (propertyName === "templateUrl") {
            reportTemplateUrl(property.value as AnyNode);
            continue;
          }

          if (propertyName === "styleUrl") {
            reportStyleUrl(property.value as AnyNode);
            continue;
          }
        }
      },
    };
  },
}) satisfies Rule;

export default componentResourceFilenames;
