export interface TimesheetEntry {
  day: string;
  hours: number;
}

export interface WeekSummary {
  weekLabel: string;
  totalHours: number;
}

export interface ClockStatus {
  clockedIn: boolean;
  since: string | null; // ISO timestamp when clocked in
}
