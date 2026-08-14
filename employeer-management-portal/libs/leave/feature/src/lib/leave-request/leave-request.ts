import { Component, signal } from '@angular/core';
import { Input as LibInput, ButtonComponent, Card } from '@employeer-management-portal/shared-ui';
import { LeaveRequest } from '@employeer-management-portal/leave-domain-api';

@Component({
  selector: 'lib-leave-request',
  imports: [LibInput, ButtonComponent, Card],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css',
})
export class LeaveRequestForm {
  startDate = signal('');
  endDate = signal('');
  reason = signal('');

  submit() {
    const request: LeaveRequest = {
      employeeName: 'Ana Marku',
      startDate: this.startDate(),
      endDate: this.endDate(),
      reason: this.reason(),
      status: 'pending'
    };
    console.log('Leave request submitted (mock):', request);
  }
}
