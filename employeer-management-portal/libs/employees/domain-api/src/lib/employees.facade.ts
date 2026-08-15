import { Signal } from '@angular/core';
import { Employee } from './models/employee.model';

/**
 * Read-only contract for the employees domain. The dashboard (in the shell)
 * depends only on this abstraction — never on employees-data-access/feature.
 * The concrete implementation lives in employees-data-access and is wired via DI.
 */
export abstract class EmployeesFacade {
  abstract readonly employees: Signal<readonly Employee[]>;
  abstract readonly totalCount: Signal<number>;
}
