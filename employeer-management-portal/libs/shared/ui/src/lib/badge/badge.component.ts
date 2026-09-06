import { Component, computed, input } from '@angular/core';

/**
 * Generic status pill used across domains (employees, leave, the shell
 * dashboard). Lives in shared-ui so any domain can reuse it without crossing
 * a module boundary.
 */
@Component({
  selector: 'lib-badge',
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
})
export class BadgeComponent {
  status = input<string>('pending');

  readonly cssClass = computed(
    () => `badge badge--${this.status().toLowerCase().replace(/\s+/g, '-')}`,
  );
}
