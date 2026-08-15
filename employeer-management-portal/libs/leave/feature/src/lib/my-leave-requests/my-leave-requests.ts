import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Card,
  Table,
  ButtonComponent,
  CurrentUserService,
  formatDate,
} from '@employeer-management-portal/shared-ui';
import { LeaveStore } from '@employeer-management-portal/leave-data-access';
import { LeaveStatusBadgeComponent } from '@employeer-management-portal/leave-ui';

@Component({
  selector: 'lib-my-leave-requests',
  imports: [Card, Table, ButtonComponent, LeaveStatusBadgeComponent],
  templateUrl: './my-leave-requests.html',
  styleUrl: './my-leave-requests.css',
})
export class MyLeaveRequests {
  private readonly store = inject(LeaveStore);
  protected readonly user = inject(CurrentUserService);
  private readonly router = inject(Router);

  readonly columns = ['Type', 'From', 'To', 'Reason', 'Status'];
  readonly pageSize = 5;

  readonly requests = computed(() => {
    // depend on the store signal so new submissions show up
    this.store.requests();
    return this.store.requestsFor(this.user.userId());
  });

  paged(page: number) {
    const start = page * this.pageSize;
    return this.requests().slice(start, start + this.pageSize);
  }

  fmt(iso: string): string {
    return formatDate(new Date(iso));
  }

  requestLeave(): void {
    this.router.navigate(['/leave/request']);
  }
}
