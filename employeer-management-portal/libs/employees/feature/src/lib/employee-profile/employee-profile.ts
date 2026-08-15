import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Card, ButtonComponent, formatDate } from '@employeer-management-portal/shared-ui';
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';
// Study-case boundary violation: employees domain reusing the leave/ui badge.
import { LeaveStatusBadgeComponent } from '@employeer-management-portal/leave-ui';

@Component({
  selector: 'lib-employee-profile',
  imports: [Card, ButtonComponent, LeaveStatusBadgeComponent],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.css',
})
export class EmployeeProfile {
  private readonly store = inject(EmployeesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = signal(this.route.snapshot.paramMap.get('id'));

  readonly employee = computed(() => {
    const id = this.id();
    return id ? this.store.getById(id) : undefined;
  });

  readonly managerName = computed(() => {
    const emp = this.employee();
    return emp ? this.store.managerOf(emp)?.name ?? 'None' : 'None';
  });

  formatStart(iso: string): string {
    return formatDate(new Date(iso));
  }

  edit(): void {
    const emp = this.employee();
    if (emp) {
      this.router.navigate(['/employees', emp.id, 'edit']);
    }
  }

  back(): void {
    this.router.navigate(['/employees']);
  }
}
