import { Component, signal } from '@angular/core';

interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
}

@Component({
  selector: 'lib-employees-feature',
  imports: [],
  templateUrl: './employees-feature.html',
  styleUrl: './employees-feature.css',
})
export class EmployeesFeature {
  employees = signal<Employee[]>([
    { id: 1, name: 'Ava Thompson', role: 'Software Engineer', department: 'Engineering' },
    { id: 2, name: 'Liam Carter', role: 'Product Manager', department: 'Product' },
    { id: 3, name: 'Sophia Nguyen', role: 'HR Specialist', department: 'Human Resources' },
    { id: 4, name: 'Noah Patel', role: 'Financial Analyst', department: 'Finance' },
    { id: 5, name: 'Emma Rodriguez', role: 'UX Designer', department: 'Design' },
  ]);
}
