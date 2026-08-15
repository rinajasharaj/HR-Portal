import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Card, ButtonComponent, Input as LibInput } from '@employeer-management-portal/shared-ui';
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';

@Component({
  selector: 'lib-employee-edit',
  imports: [Card, ButtonComponent, LibInput],
  templateUrl: './employee-edit.html',
  styleUrl: './employee-edit.css',
})
export class EmployeeEditForm {
  private readonly store = inject(EmployeesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = this.route.snapshot.paramMap.get('id');
  private readonly original = this.id ? this.store.getById(this.id) : undefined;

  readonly found = signal(!!this.original);

  readonly name = signal(this.original?.name ?? '');
  readonly role = signal(this.original?.role ?? '');
  readonly department = signal(this.original?.department ?? '');
  readonly email = signal(this.original?.email ?? '');

  save(): void {
    if (!this.original) return;
    this.store.update({
      ...this.original,
      name: this.name(),
      role: this.role(),
      department: this.department(),
      email: this.email(),
    });
    this.router.navigate(['/employees', this.original.id]);
  }

  cancel(): void {
    if (this.original) {
      this.router.navigate(['/employees', this.original.id]);
    } else {
      this.router.navigate(['/employees']);
    }
  }
}
