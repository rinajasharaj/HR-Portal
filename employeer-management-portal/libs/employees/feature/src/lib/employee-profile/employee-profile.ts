import { Component, signal } from '@angular/core';
import { Input as LibInput, ButtonComponent, Card } from '@employeer-management-portal/shared-ui';
import { Employee } from '@employeer-management-portal/employees-domain-api';

@Component({
  selector: 'lib-employee-profile',
  imports: [LibInput, ButtonComponent, Card],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.css',
})
export class EmployeeProfile {
  name = signal('Ana Marku');
  role = signal('Frontend Engineer');
  department = signal('Engineering');

  save() {
    const updated: Employee = {
      name: this.name(),
      role: this.role(),
      department: this.department()
    };
    console.log('Saved (mock):', updated);
  }
}
