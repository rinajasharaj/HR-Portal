import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Table, Card, ButtonComponent } from '@employeer-management-portal/shared-ui';
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';
// Study-case boundary violation: employees (domain:employees) importing leave/ui (domain:leave).
import { LeaveStatusBadgeComponent } from '@employeer-management-portal/leave-ui';

@Component({
  selector: 'lib-employee-list',
  imports: [Table, Card, ButtonComponent, LeaveStatusBadgeComponent],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList {
  private readonly store = inject(EmployeesStore);
  private readonly router = inject(Router);

  readonly columns = ['Name', 'Role', 'Department', 'Status'];
  readonly pageSize = 5;

  readonly departmentFilter = signal<string>('All');
  readonly departments = computed(() => ['All', ...this.store.departments()]);

  readonly filtered = computed(() => {
    const dept = this.departmentFilter();
    const all = this.store.employees();
    return dept === 'All' ? all : all.filter((e) => e.department === dept);
  });

  paged(page: number) {
    const start = page * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  }

  setDepartment(dept: string): void {
    this.departmentFilter.set(dept);
  }

  open(id: string): void {
    this.router.navigate(['/employees', id]);
  }
}
