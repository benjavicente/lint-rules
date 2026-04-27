import { eslintCompatPlugin } from "@oxlint/plugins";
import type { Plugin } from "@oxlint/plugins";

import classMemberOrder from "./rules/class-member-order/index.js";
import avoidExplicitInjectionContext from "./rules/avoid-explicit-injection-context/index.js";
import avoidNgModules from "./rules/avoid-ng-modules/index.js";
import avoidWritingSignalsInReactiveContext from "./rules/avoid-writing-signals-in-reactive-context/index.js";
import componentClassMatchesFilename from "./rules/component-class-matches-filename/index.js";
import preferLoadComponentOverLoadChildren from "./rules/prefer-load-component-over-load-children/index.js";
import preferPrivateElements from "./rules/prefer-private-elements/index.js";
import preferStyleUrl from "./rules/prefer-style-url/index.js";
import restrictInjectableProvidedIn from "./rules/restrict-injectable-provided-in/index.js";
import rulesOfInject from "./rules/rules-of-inject/index.js";

const plugin = eslintCompatPlugin({
  meta: {
    name: "@benjavicente/lint-angular",
  },
  rules: {
    "avoid-explicit-injection-context": avoidExplicitInjectionContext,
    "avoid-ng-modules": avoidNgModules,
    "avoid-writing-signals-in-reactive-context": avoidWritingSignalsInReactiveContext,
    "class-member-order": classMemberOrder,
    "component-class-matches-filename": componentClassMatchesFilename,
    "prefer-load-component-over-load-children": preferLoadComponentOverLoadChildren,
    "prefer-private-elements": preferPrivateElements,
    "prefer-style-url": preferStyleUrl,
    "restrict-injectable-provided-in": restrictInjectableProvidedIn,
    "rules-of-inject": rulesOfInject,
  },
}) satisfies Plugin;

export default plugin;
