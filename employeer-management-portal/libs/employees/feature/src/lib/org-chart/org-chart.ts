import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { Card } from '@employeer-management-portal/shared-ui';
import { EmployeesStore } from '@employeer-management-portal/employees-data-access';

@Component({
  selector: 'lib-org-chart',
  imports: [Card, NgTemplateOutlet],
  templateUrl: './org-chart.html',
  styleUrl: './org-chart.css',
})
export class OrgChart {
  private readonly store = inject(EmployeesStore);
  private readonly router = inject(Router);

  readonly tree = this.store.orgTree;

  open(id: string): void {
    this.router.navigate(['/employees', id]);
  }
}
