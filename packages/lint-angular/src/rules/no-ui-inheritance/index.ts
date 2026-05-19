import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";

const UI_DECORATORS = new Set(["Component", "Directive"]);

function hasUiDecorator(context: Context, classNode: AnyNode): boolean {
  if (!Array.isArray(classNode.decorators)) return false;
  return classNode.decorators.some((decorator: AnyNode) =>
    isAngularCoreDecorator(context, decorator, UI_DECORATORS),
  );
}

const noUiInheritance = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow inheritance for Angular components and directives.",
      recommended: true,
    },
    schema: [],
    messages: {
      noUiInheritance:
        "Avoid inheritance for Angular {{kind}} classes. Prefer composition with services or inject* helpers.",
    },
  },

  createOnce(context: Context) {
    return {
      "ClassDeclaration, ClassExpression"(node) {
        const classNode = node as AnyNode;
        if (!classNode.superClass) return;
        if (!hasUiDecorator(context, classNode)) return;

        const kind = classNode.decorators.some((decorator: AnyNode) =>
          isAngularCoreDecorator(context, decorator, new Set(["Component"])),
        )
          ? "component"
          : "directive";

        context.report({
          node: classNode.superClass,
          messageId: "noUiInheritance",
          data: { kind },
        });
      },
    };
  },
}) satisfies Rule;

export default noUiInheritance;
