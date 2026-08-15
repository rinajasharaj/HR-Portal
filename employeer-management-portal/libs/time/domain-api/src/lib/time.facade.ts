import { Signal } from '@angular/core';

/**
 * Read-only contract for the time domain, consumed by the dashboard.
 * Concrete implementation lives in time-data-access.
 */
export abstract class TimeFacade {
  abstract readonly hoursThisWeek: Signal<number>;
}
