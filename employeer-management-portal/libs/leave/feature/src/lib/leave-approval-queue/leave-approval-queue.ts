import { Component, inject } from '@angular/core';
import {
  Card,
  Table,
  ButtonComponent,
  CurrentUserService,
  formatDate,
} from '@employeer-management-portal/shared-ui';
import { LeaveStore } from '@employeer-management-portal/leave-data-access';

@Component({
  selector: 'lib-leave-approval-queue',
  imports: [Card, Table, ButtonComponent],
  templateUrl: './leave-approval-queue.html',
  styleUrl: './leave-approval-queue.css',
})
export class LeaveApprovalQueue {
  private readonly store = inject(LeaveStore);
  protected readonly user = inject(CurrentUserService);

  readonly columns = ['Employee', 'Type', 'From', 'To', 'Reason', 'Actions'];
  readonly pageSize = 5;

  readonly pending = this.store.pendingRequests;

  paged(page: number) {
    const start = page * this.pageSize;
    return this.pending().slice(start, start + this.pageSize);
  }

  fmt(iso: string): string {
    return formatDate(new Date(iso));
  }

  approve(id: string): void {
    this.store.approve(id);
  }

  reject(id: string): void {
    this.store.reject(id);
  }
}
