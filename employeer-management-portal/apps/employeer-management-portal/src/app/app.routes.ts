import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from "@angular/router";
import {ClockInOut, WeeklyTimesheet} from "@employeer-management-portal/time-feature";

export const routes: Routes = [
  {
    path: 'employees',
    loadComponent: () =>
      loadRemoteModule('employees', './Component').then((m) => m.App)
  },
  {
    path: 'leave',
    loadComponent: () =>
      loadRemoteModule('leave', './Component').then((m) => m.App)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'time',
    component: WeeklyTimesheet
  },
  {
    path: 'time/clock',
    component: ClockInOut
  }
];
