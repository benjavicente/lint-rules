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
    `class Plain {
       save() {}
       value = input("");
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
    },
    {
      code: `import { Component, input, output } from "@angular/core";
             @Component({})
             class C {
               done = output<void>();
               name = input("");
             }`,
      errors: ["outOfOrder"],
    },
  ],
});
