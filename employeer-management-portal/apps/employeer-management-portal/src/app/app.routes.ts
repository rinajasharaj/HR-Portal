import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: 'employees',
    loadComponent: () =>
      loadRemoteModule('employees', './Component').then((m) => m.App)
  }
];
