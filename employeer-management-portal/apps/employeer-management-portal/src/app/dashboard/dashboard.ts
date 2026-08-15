import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Card,
  ButtonComponent,
  ActivityEvent,
} from '@employeer-management-portal/shared-ui';
import { EmployeesFacade } from '@employeer-management-portal/employees-domain-api';
import { LeaveFacade } from '@employeer-management-portal/leave-domain-api';
import { TimeFacade } from '@employeer-management-portal/time-domain-api';
// Study-case boundary violation: the shell dashboard reusing the leave/ui badge.
import { LeaveStatusBadgeComponent } from '@employeer-management-portal/leave-ui';

@Component({
  selector: 'app-dashboard',
  imports: [Card, ButtonComponent, RouterLink, LeaveStatusBadgeComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // Cross-domain reads go through each domain's read-only facade only.
  private readonly employees = inject(EmployeesFacade);
  private readonly leave = inject(LeaveFacade);
  private readonly time = inject(TimeFacade);

  readonly employeeCount = this.employees.totalCount;
  readonly pendingLeaveCount = this.leave.pendingCount;
  readonly hoursThisWeek = this.time.hoursThisWeek;
  readonly upcomingLeaveCount = this.leave.upcomingThisMonthCount;

  readonly recentActivity = signal<ActivityEvent[]>([
    {
      id: 'a1',
      domain: 'leave',
      message: 'Ana Marku requested sick leave',
      timestamp: '2h ago',
      status: 'pending',
    },
    {
      id: 'a2',
      domain: 'leave',
      message: "Fatjon Rama's vacation is awaiting approval",
      timestamp: '5h ago',
      status: 'pending',
    },
    {
      id: 'a3',
      domain: 'employees',
      message: 'Klaudia Berisha was marked inactive',
      timestamp: 'Yesterday',
    },
    {
      id: 'a4',
      domain: 'time',
      message: 'Gent Sula logged 40h last week',
      timestamp: 'Yesterday',
    },
    {
      id: 'a5',
      domain: 'leave',
      message: "Ana Marku's family trip was approved",
      timestamp: '2 days ago',
      status: 'approved',
    },
  ]);
}
