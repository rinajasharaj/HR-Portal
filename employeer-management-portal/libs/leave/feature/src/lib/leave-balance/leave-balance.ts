import { Component, computed, inject } from '@angular/core';
import {
  Card,
  CurrentUserService,
} from '@employeer-management-portal/shared-ui';
import { LeaveBalance } from '@employeer-management-portal/leave-domain-api';
import { LeaveStore } from '@employeer-management-portal/leave-data-access';
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';

@Component({
  selector: 'lib-leave-balance',
  imports: [Card],
  templateUrl: './leave-balance.html',
  styleUrl: './leave-balance.css',
})
export class LeaveBalanceView {
  private readonly store = inject(LeaveStore);
  private readonly user = inject(CurrentUserService);
  private readonly employees = inject(EmployeesStore);

  readonly balances = computed<LeaveBalance[]>(() => {
    this.store.requests(); // react to changes
    return this.store.balancesFor(this.user.userId());
  });

  remaining(b: LeaveBalance): number {
    return Math.max(0, b.entitled - b.used);
  }

  pct(b: LeaveBalance): number {
    return b.entitled === 0 ? 0 : Math.min(100, (b.used / b.entitled) * 100);
  }
}
