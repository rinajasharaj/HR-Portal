import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Card,
  ButtonComponent,
  Input as LibInput,
  CurrentUserService,
} from '@employeer-management-portal/shared-ui';
import { LeaveType } from '@employeer-management-portal/leave-domain-api';
import { LeaveStore } from '@employeer-management-portal/leave-data-access';

@Component({
  selector: 'lib-leave-request',
  imports: [Card, ButtonComponent, LibInput],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css',
})
export class LeaveRequestForm {
  private readonly store = inject(LeaveStore);
  private readonly user = inject(CurrentUserService);
  private readonly router = inject(Router);

  readonly leaveTypes: LeaveType[] = ['vacation', 'sick', 'unpaid'];

  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly leaveType = signal<LeaveType>('vacation');
  readonly reason = signal('');

  readonly canSubmit = computed(
    () =>
      this.startDate().trim().length > 0 &&
      this.endDate().trim().length > 0 &&
      this.reason().trim().length > 0,
  );

  setType(type: LeaveType): void {
    this.leaveType.set(type);
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.store.add({
      employeeId: this.user.userId(),
      employeeName: this.user.userName(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      leaveType: this.leaveType(),
      reason: this.reason(),
    });
    this.router.navigate(['/leave']);
  }

  cancel(): void {
    this.router.navigate(['/leave']);
  }
}
