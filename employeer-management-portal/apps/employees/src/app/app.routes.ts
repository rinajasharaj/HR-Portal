import { Routes } from '@angular/router';
import { EmployeeList } from '@employeer-management-portal/employees-feature';
import { EmployeeProfile } from '@employeer-management-portal/employees-feature';

export const routes: Routes = [
  { path: '', component: EmployeeList },
  { path: 'profile', component: EmployeeProfile }
];
