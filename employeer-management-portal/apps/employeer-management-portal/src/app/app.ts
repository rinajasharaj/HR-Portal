import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Shell,
  NavItem,
  CurrentUserService,
} from '@employeer-management-portal/shared-ui';

@Component({
  imports: [RouterModule, Shell],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly user = inject(CurrentUserService);

  readonly navItems = computed<NavItem[]>(() => {
    const base: NavItem[] = [
      { label: 'Dashboard', route: '/dashboard' },
      { label: 'Employees', route: '/employees' },
      { label: 'Org chart', route: '/employees/org-chart' },
      { label: 'My leave', route: '/leave' },
      { label: 'Request leave', route: '/leave/request' },
      { label: 'Leave balance', route: '/leave/balance' },
      { label: 'Timesheet', route: '/time' },
      { label: 'Clock in/out', route: '/time/clock' },
      { label: 'Time history', route: '/time/history' },
    ];
    return this.user.isManager()
      ? [...base, { label: 'Approvals', route: '/leave/approvals' }]
      : base;
  });
}
