import { Component, signal, computed } from '@angular/core';
import { Table, Card } from '@employeer-management-portal/shared-ui';
import { Employee } from '@employeer-management-portal/employees-domain-api';

@Component({
  selector: 'lib-employee-list',
  imports: [Table, Card],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList {
  pageSize = 5;

  employees = signal<Employee[]>([
    { name: 'Ana Marku', role: 'Frontend Engineer', department: 'Engineering' },
    { name: 'Bledi Hoxha', role: 'HR Manager', department: 'Human Resources' },
    { name: 'Elira Krasniqi', role: 'Backend Engineer', department: 'Engineering' },
    { name: 'Gent Sula', role: 'Product Manager', department: 'Product' },
    { name: 'Klaudia Berisha', role: 'Designer', department: 'Design' },
    { name: 'Fatjon Rama', role: 'QA Engineer', department: 'Engineering' }
  ]);

  pagedEmployees = computed(() => this.employees().slice(0, this.pageSize));
}
