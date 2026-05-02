import { eslintCompatPlugin } from "@oxlint/plugins";
import type { Plugin } from "@oxlint/plugins";

import classMemberOrder from "./rules/class-member-order/index.js";
import avoidExplicitInjectionContext from "./rules/avoid-explicit-injection-context/index.js";
import avoidExplicitSubscriptionManagement from "./rules/avoid-explicit-subscription-management/index.js";
import avoidNgModules from "./rules/avoid-ng-modules/index.js";
import avoidRxjsStateInComponent from "./rules/avoid-rxjs-state-in-component/index.js";
import avoidWritingSignalsInReactiveContext from "./rules/avoid-writing-signals-in-reactive-context/index.js";
import componentClassMatchesFilename from "./rules/component-class-matches-filename/index.js";
import componentResourceFilenames from "./rules/component-resource-filenames/index.js";
import preferLoadComponentOverLoadChildren from "./rules/prefer-load-component-over-load-children/index.js";
import preferPrivateElements from "./rules/prefer-private-elements/index.js";
import preferStyleUrl from "./rules/prefer-style-url/index.js";
import publicComponentInterface from "./rules/public-component-interface/index.js";
import restrictInjectableProvidedIn from "./rules/restrict-injectable-provided-in/index.js";
import rulesOfInject from "./rules/rules-of-inject/index.js";

const plugin = eslintCompatPlugin({
  meta: {
    name: "@benjavicente/lint-angular",
  },
  rules: {
    "avoid-explicit-injection-context": avoidExplicitInjectionContext,
    "avoid-explicit-subscription-management": avoidExplicitSubscriptionManagement,
    "avoid-ng-modules": avoidNgModules,
    "avoid-rxjs-state-in-component": avoidRxjsStateInComponent,
    "avoid-writing-signals-in-reactive-context": avoidWritingSignalsInReactiveContext,
    "class-member-order": classMemberOrder,
    "component-class-matches-filename": componentClassMatchesFilename,
    "component-resource-filenames": componentResourceFilenames,
    "prefer-load-component-over-load-children": preferLoadComponentOverLoadChildren,
    "prefer-private-elements": preferPrivateElements,
    "prefer-style-url": preferStyleUrl,
    "public-component-interface": publicComponentInterface,
    "restrict-injectable-provided-in": restrictInjectableProvidedIn,
    "rules-of-inject": rulesOfInject,
  },
}) satisfies Plugin;

export default plugin;
