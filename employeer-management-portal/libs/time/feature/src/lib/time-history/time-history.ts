import { Component, inject } from '@angular/core';
import { Card } from '@employeer-management-portal/shared-ui';
import { TimeStore } from '@employeer-management-portal/time-data-access';

@Component({
  selector: 'lib-time-history',
  imports: [Card],
  templateUrl: './time-history.html',
  styleUrl: './time-history.css',
})
export class TimeHistory {
  private readonly store = inject(TimeStore);
  readonly history = this.store.history;
}
