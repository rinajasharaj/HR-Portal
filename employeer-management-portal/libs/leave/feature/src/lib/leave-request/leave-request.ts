import { Component, signal } from '@angular/core';

@Component({
  selector: 'lib-leave-request',
  imports: [],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css',
})
export class LeaveRequest {
  startDate = signal('');
  endDate = signal('');
  reason = signal('');
  submitted = signal(false);

  updateStartDate(value: string) {
    this.startDate.set(value);
  }

  updateEndDate(value: string) {
    this.endDate.set(value);
  }

  updateReason(value: string) {
    this.reason.set(value);
  }

  submit() {
    this.submitted.set(true);
  }
}
