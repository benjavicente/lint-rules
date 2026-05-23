# `no-manual-change-detection`

Disallow manual Angular change detection through `ChangeDetectorRef`.

This rule detects the common manual change-detection pattern: injecting or storing `ChangeDetectorRef`, then calling methods such as `detectChanges()`, `markForCheck()`, `detach()`, `reattach()`, or `checkNoChanges()`.

The rule intentionally does not flag `ComponentFixture.detectChanges()` in tests.

## Invalid

```ts
import { ChangeDetectorRef } from "@angular/core";

class UserCard {
  constructor(private readonly cdr: ChangeDetectorRef) {}

  refresh() {
    this.cdr.detectChanges();
  }
}
```

```ts
import { ChangeDetectorRef, inject } from "@angular/core";

class UserCard {
  private readonly cdr = inject(ChangeDetectorRef);

  refresh() {
    this.cdr.markForCheck();
  }
}
```

## Valid

```ts
import { ComponentFixture } from "@angular/core/testing";

let fixture: ComponentFixture<UserCard>;
fixture.detectChanges();
```
