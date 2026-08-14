import { Component, signal, computed } from '@angular/core';
import { Table, Card } from '@employeer-management-portal/shared-ui';
import { TimesheetEntry } from '@employeer-management-portal/time-domain-api';

@Component({
  selector: 'lib-weekly-timesheet',
  imports: [Table, Card],
  templateUrl: './weekly-timesheet.html',
  styleUrl: './weekly-timesheet.css',
})
export class WeeklyTimesheet {
  entries = signal<TimesheetEntry[]>([
    { day: 'Monday', hours: 8 },
    { day: 'Tuesday', hours: 8 },
    { day: 'Wednesday', hours: 7.5 },
    { day: 'Thursday', hours: 8 },
    { day: 'Friday', hours: 6 }
  ]);

  totalHours = computed(() => this.entries().reduce((sum, e) => sum + e.hours, 0));
}
