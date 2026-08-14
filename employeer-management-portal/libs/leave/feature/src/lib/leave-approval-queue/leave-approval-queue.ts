import { Component, signal } from '@angular/core';
import { Table, ButtonComponent, Card } from '@employeer-management-portal/shared-ui';
import { LeaveRequest } from '@employeer-management-portal/leave-domain-api';

@Component({
  selector: 'lib-leave-approval-queue',
  imports: [Table, ButtonComponent, Card],
  templateUrl: './leave-approval-queue.html',
  styleUrl: './leave-approval-queue.css',
})
export class LeaveApprovalQueue {
  requests = signal<LeaveRequest[]>([
    { employeeName: 'Ana Marku', startDate: '2026-08-20', endDate: '2026-08-22', reason: 'Family trip', status: 'pending' },
    { employeeName: 'Fatjon Rama', startDate: '2026-08-25', endDate: '2026-08-26', reason: 'Medical appointment', status: 'pending' }
  ]);

  pendingRequests = () => this.requests().filter(r => r.status === 'pending');

  approve(req: LeaveRequest) {
    req.status = 'approved';
    this.requests.set([...this.requests()]);
  }

  reject(req: LeaveRequest) {
    req.status = 'rejected';
    this.requests.set([...this.requests()]);
  }
}
