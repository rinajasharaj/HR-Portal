import { Component, inject } from '@angular/core';
import {
  Card,
  Table,
  Input as LibInput,
} from '@employeer-management-portal/shared-ui';
import { TimeStore } from '@employeer-management-portal/time-data-access';
// import { LeaveSummary } from '@employeer-management-portal/leave-domain-api';
// INTENTIONAL BOUNDARY VIOLATION: time-feature reaches into employees' internal
// data-access layer instead of going through employees-domain-api.
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';

@Component({
  selector: 'lib-weekly-timesheet',
  imports: [Card, Table, LibInput],
  templateUrl: './weekly-timesheet.html',
  styleUrl: './weekly-timesheet.css',
})
export class WeeklyTimesheet {
  private readonly store = inject(TimeStore);
  private readonly employees = inject(EmployeesStore);

  readonly employeeCount = this.employees.totalCount;

  readonly columns = ['Day', 'Hours'];
  readonly week = this.store.week;
  readonly total = this.store.hoursThisWeek;

  onHours(day: string, value: string): void {
    this.store.updateHours(day, parseFloat(value));
  }
}
