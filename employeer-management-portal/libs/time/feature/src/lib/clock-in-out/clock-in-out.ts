import { Component, computed, inject } from '@angular/core';
import { Card, ButtonComponent } from '@employeer-management-portal/shared-ui';
import { TimeStore } from '@employeer-management-portal/time-data-access';

@Component({
  selector: 'lib-clock-in-out',
  imports: [Card, ButtonComponent],
  templateUrl: './clock-in-out.html',
  styleUrl: './clock-in-out.css',
})
export class ClockInOut {
  private readonly store = inject(TimeStore);

  readonly clock = this.store.clock;

  readonly sinceLabel = computed(() => {
    const since = this.clock().since;
    if (!since) return '';
    return new Date(since).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  toggle(): void {
    if (this.clock().clockedIn) {
      this.store.clockOut();
    } else {
      this.store.clockIn();
    }
  }
}
