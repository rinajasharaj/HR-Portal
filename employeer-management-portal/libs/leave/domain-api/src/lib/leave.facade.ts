import { Signal } from '@angular/core';
import { LeaveRequest } from './models/leave-request.model';

/**
 * Read-only contract for the leave domain, consumed by the dashboard.
 * Concrete implementation lives in leave-data-access.
 */
export abstract class LeaveFacade {
  abstract readonly requests: Signal<readonly LeaveRequest[]>;
  abstract readonly pendingCount: Signal<number>;
  abstract readonly upcomingThisMonthCount: Signal<number>;
}
