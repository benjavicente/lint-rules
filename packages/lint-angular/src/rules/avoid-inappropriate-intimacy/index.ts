import { defineRule } from "@oxlint/plugins";
import type { Context, Rule } from "@oxlint/plugins";
import type { AnyNode } from "../../utilities/ast.js";
import { isAngularCoreDecorator } from "../../utilities/angular.js";

const TARGET_DECORATORS = new Set(["Component", "Directive", "Injectable", "Service"]);

function getAngularClassKind(
  context: Context,
  classNode: AnyNode | null | undefined,
): string | null {
  if (!classNode || !Array.isArray(classNode.decorators)) return null;

  if (
    classNode.decorators.some((decorator: AnyNode) =>
      isAngularCoreDecorator(context, decorator, new Set(["Component"])),
    )
  ) {
    return "component";
  }

  if (
    classNode.decorators.some((decorator: AnyNode) =>
      isAngularCoreDecorator(context, decorator, new Set(["Directive"])),
    )
  ) {
    return "directive";
  }

  if (
    classNode.decorators.some((decorator: AnyNode) =>
      isAngularCoreDecorator(context, decorator, TARGET_DECORATORS),
    )
  ) {
    return "service";
  }

  return null;
}

const avoidInappropriateIntimacy = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow passing Angular component, directive, and service instances as function arguments.",
      recommended: true,
    },
    schema: [],
    messages: {
      avoidThisArgument:
        "Avoid passing this {{kind}} instance as an argument. Pass the specific values or callbacks the callee needs.",
    },
  },

  createOnce(context: Context) {
    return {
      CallExpression(node) {
        const callNode = node as AnyNode;
        const thisArguments = (callNode.arguments ?? []).filter(
          (argument: AnyNode) => argument.type === "ThisExpression",
        );
        if (!thisArguments.length) return;

        const ancestors = context.sourceCode.getAncestors(callNode) as AnyNode[];
        const classNode = ancestors.findLast(
          (ancestor) => ancestor.type === "ClassDeclaration" || ancestor.type === "ClassExpression",
        );
        const kind = getAngularClassKind(context, classNode);
        if (!kind) return;

        for (const argument of thisArguments) {
          context.report({
            node: argument,
            messageId: "avoidThisArgument",
            data: { kind },
          });
        }
      },
    };
  },
}) satisfies Rule;

export default avoidInappropriateIntimacy;
