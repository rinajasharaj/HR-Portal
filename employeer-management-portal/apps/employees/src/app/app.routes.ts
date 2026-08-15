import { Routes } from '@angular/router';
import {
  EmployeeList,
  EmployeeProfile,
  EmployeeEditForm,
  OrgChart,
} from '@employeer-management-portal/employees-feature';

export const routes: Routes = [
  { path: '', component: EmployeeList },
  { path: 'org-chart', component: OrgChart },
  { path: ':id/edit', component: EmployeeEditForm },
  { path: ':id', component: EmployeeProfile },
];
