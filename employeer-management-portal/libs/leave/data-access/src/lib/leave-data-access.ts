import { Injectable, Provider, computed, signal } from '@angular/core';
import {
  LeaveBalance,
  LeaveFacade,
  LeaveRequest,
  LeaveType,
} from '@employeer-management-portal/leave-domain-api';

/** Inclusive calendar-day count between two ISO dates. */
function inclusiveDays(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

const MOCK_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr1',
    employeeId: 'e2',
    employeeName: 'Ana Marku',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    leaveType: 'vacation',
    reason: 'Family trip',
    status: 'approved',
  },
  {
    id: 'lr2',
    employeeId: 'e2',
    employeeName: 'Ana Marku',
    startDate: '2026-09-02',
    endDate: '2026-09-03',
    leaveType: 'sick',
    reason: 'Medical appointment',
    status: 'pending',
  },
  {
    id: 'lr3',
    employeeId: 'e5',
    employeeName: 'Fatjon Rama',
    startDate: '2026-08-25',
    endDate: '2026-08-26',
    leaveType: 'vacation',
    reason: 'Short break',
    status: 'pending',
  },
  {
    id: 'lr4',
    employeeId: 'e3',
    employeeName: 'Gent Sula',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    leaveType: 'unpaid',
    reason: 'Personal matters',
    status: 'rejected',
  },
  {
    id: 'lr5',
    employeeId: 'e6',
    employeeName: 'Elira Krasniqi',
    startDate: '2026-08-28',
    endDate: '2026-08-30',
    leaveType: 'vacation',
    reason: 'Long weekend',
    status: 'pending',
  },
  {
    id: 'lr6',
    employeeId: 'e2',
    employeeName: 'Ana Marku',
    startDate: '2026-12-23',
    endDate: '2026-12-27',
    leaveType: 'vacation',
    reason: 'Winter holidays',
    status: 'approved',
  },
];

const ENTITLEMENTS: Record<LeaveType, number> = {
  vacation: 20,
  sick: 10,
  unpaid: 0,
};

@Injectable({ providedIn: 'root' })
export class LeaveStore implements LeaveFacade {
  private readonly _requests = signal<LeaveRequest[]>(MOCK_REQUESTS);
  private nextId = MOCK_REQUESTS.length + 1;

  readonly requests = this._requests.asReadonly();

  readonly pendingCount = computed(
    () => this._requests().filter((r) => r.status === 'pending').length,
  );

  readonly pendingRequests = computed(() =>
    this._requests().filter((r) => r.status === 'pending'),
  );

  readonly upcomingThisMonthCount = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return this._requests().filter((r) => {
      if (r.status === 'rejected') return false;
      const start = new Date(r.startDate);
      return (
        start.getMonth() === month &&
        start.getFullYear() === year &&
        start >= new Date(now.toDateString())
      );
    }).length;
  });

  requestsFor(employeeId: string): LeaveRequest[] {
    return this._requests().filter((r) => r.employeeId === employeeId);
  }

  balancesFor(employeeId: string): LeaveBalance[] {
    const mine = this._requests().filter(
      (r) => r.employeeId === employeeId && r.status === 'approved',
    );
    return (Object.keys(ENTITLEMENTS) as LeaveType[]).map((leaveType) => ({
      leaveType,
      entitled: ENTITLEMENTS[leaveType],
      used: mine
        .filter((r) => r.leaveType === leaveType)
        .reduce((sum, r) => sum + inclusiveDays(r.startDate, r.endDate), 0),
    }));
  }

  add(request: Omit<LeaveRequest, 'id' | 'status'>): void {
    this._requests.update((list) => [
      { ...request, id: `lr${this.nextId++}`, status: 'pending' },
      ...list,
    ]);
  }

  approve(id: string): void {
    this.setStatus(id, 'approved');
  }

  reject(id: string): void {
    this.setStatus(id, 'rejected');
  }

  private setStatus(id: string, status: LeaveRequest['status']): void {
    this._requests.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }
}

/** Wires the read-only facade to the concrete store for the dashboard. */
export function provideLeaveData(): Provider[] {
  return [{ provide: LeaveFacade, useExisting: LeaveStore }];
}
