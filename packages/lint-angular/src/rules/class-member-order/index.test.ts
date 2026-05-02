import { run } from "oxlint-vitest-rule-tester";
import classMemberOrder from "./index.js";

await run({
  name: "class-member-order",
  rule: classMemberOrder,
  valid: [
    `import { Component, computed, effect, inject, input, model, output } from "@angular/core";
     @Component({})
     class C {
       private readonly service = inject(Service);
       readonly name = input("");
       readonly value = model(0);
       readonly saved = output<void>();
       readonly doubled = computed(() => this.value() * 2);
       readonly log = effect(() => console.log(this.value()));
       ngOnInit() {}
       save() {}
     }`,
    `import { Component, inject, input, model, output } from "@angular/core";
     @Component({})
     class C {
       private readonly service = inject(Service);
       readonly name = input.required<string>();
       readonly value = model.required<number>();
       readonly saved = output<void>();
       save() {}
     }`,
    `import * as ng from "@angular/core";
     @ng.Component({})
     class C {
       private readonly service = ng.inject(Service);
       readonly name = ng.input.required<string>();
       readonly value = ng.model.required<number>();
       readonly saved = ng.output<void>();
       save() {}
     }`,
    `class Plain {
       save() {}
       value = input("");
     }`,
    `import { Component } from "@angular/core";
     import { input, inject, output } from "not-angular";
     @Component({})
     class C {
       helper = makeHelper();
       value = input("");
       service = inject(Service);
       saved = output<void>();
     }`,
    `import { Component } from "not-angular";
     import { inject, input } from "@angular/core";
     @Component({})
     class C {
       name = input("");
       service = inject(Service);
     }`,
    `import { Component, input } from "@angular/core";
     @Component({})
     class C {
       helper = createHelper();
       name = input(this.helper.initialName);
     }`,
  ],
  invalid: [
    {
      code: `import { Component, inject, input } from "@angular/core";
             @Component({})
             class C {
               name = input("");
               service = inject(Service);
             }`,
      errors: ["outOfOrder"],
      output: `import { Component, inject, input } from "@angular/core";
             @Component({})
             class C {
               service = inject(Service);
               name = input("");
             }`,
    },
    {
      code: `import { Component, Input, Output, EventEmitter } from "@angular/core";
             @Component({})
             class C {
               other = 1;
               @Input() name = "";
               unrelated = 2;
               @Output() saved = new EventEmitter<void>();
               constructor() {}
               ngOnDestroy() {}
               helper() {}
             }`,
      errors: ["outOfOrder", "outOfOrder"],
    },
    {
      code: `import { Component, input } from "@angular/core";
             @Component({})
             class C {
               save() {}
               ngOnInit() {}
               name = input("");
             }`,
      errors: ["outOfOrder"],
      output: null,
    },
    {
      code: `import { Component, input } from "@angular/core";
             import { injectSomething } from "my-lib";
             @Component({})
             class C {
               other = injectSoemthing()
               name = input("");
             }`,
      errors: ["outOfOrder"],
    },
    {
      code: `import { Component, inject, output } from "@angular/core";
             @Component({})
             class C {
               helper = makeHelper();
               service = inject(Service);
               saved = output<void>();
             }`,
      errors: ["outOfOrder", "outOfOrder"],
      output: `import { Component, inject, output } from "@angular/core";
             @Component({})
             class C {
               service = inject(Service);
               saved = output<void>();
               helper = makeHelper();
             }`,
    },
    {
      code: `import { Component, input, output } from "@angular/core";
             @Component({})
             class C {
               done = output<void>();
               name = input("");
             }`,
      errors: ["outOfOrder"],
      output: `import { Component, input, output } from "@angular/core";
             @Component({})
             class C {
               name = input("");
               done = output<void>();
             }`,
    },
    {
      code: `import { Component, input, output } from "@angular/core";
             @Component({})
             class C {
               done = output<void>();
               name = input("");
               doubled = computed(() => this.name());
             }`,
      errors: ["outOfOrder"],
      output: `import { Component, input, output } from "@angular/core";
             @Component({})
             class C {
               name = input("");
               done = output<void>();
               doubled = computed(() => this.name());
             }`,
    },
    {
      code: `import { Component, input } from "@angular/core";
             @Component({})
             class C {
               other = 1;
               helper = createHelper();
               name = input(this.helper.initialName);
             }`,
      errors: ["outOfOrder", "outOfOrder"],
      output: `import { Component, input } from "@angular/core";
             @Component({})
             class C {
               helper = createHelper();
               name = input(this.helper.initialName);
               other = 1;
             }`,
    },
    {
      code: `import { Component, input } from "@angular/core";
             @Component({})
             class C {
               helper = createHelper();
               name = input(this.external.initialName);
             }`,
      errors: ["outOfOrder"],
      output: null,
    },
    {
      code: `import { Component, Input, input } from "@angular/core";
             @Component({})
             class C {
               other = 1;
               @Input() name = "";
               value = input("");
             }`,
      errors: ["outOfOrder", "outOfOrder"],
      output: null,
    },
  ],
});
