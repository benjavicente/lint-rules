import { eslintCompatPlugin } from "@oxlint/plugins";
import type { Plugin } from "@oxlint/plugins";

import classMemberOrder from "./rules/class-member-order/index.js";
import avoidExplicitInjectionContext from "./rules/avoid-explicit-injection-context/index.js";
import avoidExplicitSubscriptionManagement from "./rules/avoid-explicit-subscription-management/index.js";
import avoidInappropriateIntimacy from "./rules/avoid-inappropriate-intimacy/index.js";
import avoidNgModules from "./rules/avoid-ng-modules/index.js";
import avoidRxjsStateInComponent from "./rules/avoid-rxjs-state-in-component/index.js";
import avoidWritingSignalsInReactiveContext from "./rules/avoid-writing-signals-in-reactive-context/index.js";
import classMatchesFilename from "./rules/class-matches-filename/index.js";
import componentResourceFilenames from "./rules/component-resource-filenames/index.js";
import decoratorFilenameSuffix from "./rules/decorator-filename-suffix/index.js";
import noManualChangeDetection from "./rules/no-manual-change-detection/index.js";
import noResourceApi from "./rules/no-resource-api/index.js";
import noRouteResolvers from "./rules/no-route-resolvers/index.js";
import noUiInheritance from "./rules/no-ui-inheritance/index.js";
import preferLoadComponentOverLoadChildren from "./rules/prefer-load-component-over-load-children/index.js";
import preferPrivateElements from "./rules/prefer-private-elements/index.js";
import preferStyleUrl from "./rules/prefer-style-url/index.js";
import publicComponentInterface from "./rules/public-component-interface/index.js";
import restrictInjectableProvidedIn from "./rules/restrict-injectable-provided-in/index.js";
import rulesOfInject from "./rules/rules-of-inject/index.js";
import tanstackQueryInjectsOnlyInComponentBody from "./rules/tanstack-query-injects-only-in-component-body/index.js";
import tanstackQueryInlinedKeys from "./rules/tanstack-query-inlined-keys/index.js";
import tanstackQueryPreferQueryOptions from "./rules/tanstack-query-prefer-query-options/index.js";
import vitestNoIncompatibleAngularTestingApis from "./rules/vitest-no-incompatible-angular-testing-apis/index.js";

const plugin = eslintCompatPlugin({
  meta: {
    name: "@benjavicente/lint-angular",
  },
  rules: {
    "avoid-explicit-injection-context": avoidExplicitInjectionContext,
    "avoid-explicit-subscription-management": avoidExplicitSubscriptionManagement,
    "avoid-inappropriate-intimacy": avoidInappropriateIntimacy,
    "avoid-ng-modules": avoidNgModules,
    "avoid-rxjs-state-in-component": avoidRxjsStateInComponent,
    "avoid-writing-signals-in-reactive-context": avoidWritingSignalsInReactiveContext,
    "class-member-order": classMemberOrder,
    "class-matches-filename": classMatchesFilename,
    "component-resource-filenames": componentResourceFilenames,
    "decorator-filename-suffix": decoratorFilenameSuffix,
    "no-manual-change-detection": noManualChangeDetection,
    "no-resource-api": noResourceApi,
    "no-route-resolvers": noRouteResolvers,
    "no-ui-inheritance": noUiInheritance,
    "prefer-load-component-over-load-children": preferLoadComponentOverLoadChildren,
    "prefer-private-elements": preferPrivateElements,
    "prefer-style-url": preferStyleUrl,
    "public-component-interface": publicComponentInterface,
    "restrict-injectable-provided-in": restrictInjectableProvidedIn,
    "rules-of-inject": rulesOfInject,
    "tanstack-query-injects-only-in-component-body": tanstackQueryInjectsOnlyInComponentBody,
    "tanstack-query-inlined-keys": tanstackQueryInlinedKeys,
    "tanstack-query-prefer-query-options": tanstackQueryPreferQueryOptions,
    "vitest-no-incompatible-angular-testing-apis": vitestNoIncompatibleAngularTestingApis,
  },
}) satisfies Plugin;

export default plugin;
