import { Component, computed, input } from '@angular/core';

/**
 * NOTE (study case): this badge lives in `leave/ui` (domain:leave) but is reused
 * from the employees domain and the shell dashboard. That is a deliberate module
 * boundary violation kept for the architecture-analyzer to flag. In a clean design
 * this would be a generic `lib-badge` in shared-ui.
 */
@Component({
  selector: 'lib-leave-status-badge',
  imports: [],
  templateUrl: './leave-status-badge.component.html',
  styleUrl: './leave-status-badge.component.css',
})
export class LeaveStatusBadgeComponent {
  status = input<string>('pending');

  readonly cssClass = computed(
    () => `badge badge--${this.status().toLowerCase().replace(/\s+/g, '-')}`,
  );
}
