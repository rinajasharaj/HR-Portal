import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';
import {
  ClockInOut,
  WeeklyTimesheet,
  TimeHistory,
} from '@employeer-management-portal/time-feature';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'employees',
    loadChildren: () =>
      loadRemoteModule('employees', './routes').then((m) => m.routes),
  },
  {
    path: 'leave',
    loadChildren: () =>
      loadRemoteModule('leave', './routes').then((m) => m.routes),
  },
  { path: 'time', component: WeeklyTimesheet },
  { path: 'time/clock', component: ClockInOut },
  { path: 'time/history', component: TimeHistory },
];
