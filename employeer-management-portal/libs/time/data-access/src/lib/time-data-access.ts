import { Injectable, Provider, computed, signal } from '@angular/core';
import {
  ClockStatus,
  TimeFacade,
  TimesheetEntry,
  WeekSummary,
} from '@employeer-management-portal/time-domain-api';

const INITIAL_WEEK: TimesheetEntry[] = [
  { day: 'Monday', hours: 8 },
  { day: 'Tuesday', hours: 8 },
  { day: 'Wednesday', hours: 7.5 },
  { day: 'Thursday', hours: 8 },
  { day: 'Friday', hours: 6 },
  { day: 'Saturday', hours: 0 },
  { day: 'Sunday', hours: 0 },
];

const HISTORY: WeekSummary[] = [
  { weekLabel: 'Aug 4 – Aug 8, 2026', totalHours: 40 },
  { weekLabel: 'Jul 28 – Aug 1, 2026', totalHours: 38.5 },
  { weekLabel: 'Jul 21 – Jul 25, 2026', totalHours: 41 },
  { weekLabel: 'Jul 14 – Jul 18, 2026', totalHours: 37.5 },
];

@Injectable({ providedIn: 'root' })
export class TimeStore implements TimeFacade {
  private readonly _week = signal<TimesheetEntry[]>(INITIAL_WEEK);
  private readonly _clock = signal<ClockStatus>({
    clockedIn: false,
    since: null,
  });
  private readonly _history = signal<WeekSummary[]>(HISTORY);

  readonly week = this._week.asReadonly();
  readonly clock = this._clock.asReadonly();
  readonly history = this._history.asReadonly();

  readonly hoursThisWeek = computed(() =>
    this._week().reduce((sum, e) => sum + (e.hours || 0), 0),
  );

  updateHours(day: string, hours: number): void {
    const safe = Number.isFinite(hours) ? Math.max(0, Math.min(24, hours)) : 0;
    this._week.update((week) =>
      week.map((e) => (e.day === day ? { ...e, hours: safe } : e)),
    );
  }

  clockIn(): void {
    this._clock.set({ clockedIn: true, since: new Date().toISOString() });
  }

  clockOut(): void {
    this._clock.set({ clockedIn: false, since: null });
  }
}

/** Wires the read-only facade to the concrete store for the dashboard. */
export function provideTimeData(): Provider[] {
  return [{ provide: TimeFacade, useExisting: TimeStore }];
}
