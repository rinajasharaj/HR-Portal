import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideEmployeesData } from '@employeer-management-portal/employees-data-access';
import { provideLeaveData } from '@employeer-management-portal/leave-data-access';
import { provideTimeData } from '@employeer-management-portal/time-data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Wire each domain's read-only facade so the dashboard can read cross-domain
    // data through domain-api only.
    provideEmployeesData(),
    provideLeaveData(),
    provideTimeData(),
  ],
};
