import { Injectable, Provider, computed, signal } from '@angular/core';
import {
  Employee,
  EmployeesFacade,
  OrgNode,
} from '@employeer-management-portal/employees-domain-api';

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Bledi Hoxha',
    role: 'HR Manager',
    department: 'Human Resources',
    email: 'bledi.hoxha@company.com',
    startDate: '2019-01-14',
    managerId: null,
    status: 'active',
  },
  {
    id: 'e6',
    name: 'Elira Krasniqi',
    role: 'Engineering Manager',
    department: 'Engineering',
    email: 'elira.krasniqi@company.com',
    startDate: '2020-05-04',
    managerId: 'e1',
    status: 'active',
  },
  {
    id: 'e2',
    name: 'Ana Marku',
    role: 'Frontend Engineer',
    department: 'Engineering',
    email: 'ana.marku@company.com',
    startDate: '2022-03-01',
    managerId: 'e6',
    status: 'on-leave',
  },
  {
    id: 'e5',
    name: 'Fatjon Rama',
    role: 'QA Engineer',
    department: 'Engineering',
    email: 'fatjon.rama@company.com',
    startDate: '2023-09-11',
    managerId: 'e6',
    status: 'active',
  },
  {
    id: 'e3',
    name: 'Gent Sula',
    role: 'Product Manager',
    department: 'Product',
    email: 'gent.sula@company.com',
    startDate: '2021-07-19',
    managerId: 'e1',
    status: 'active',
  },
  {
    id: 'e4',
    name: 'Klaudia Berisha',
    role: 'Designer',
    department: 'Design',
    email: 'klaudia.berisha@company.com',
    startDate: '2024-02-05',
    managerId: 'e3',
    status: 'inactive',
  },
];

@Injectable({ providedIn: 'root' })
export class EmployeesStore implements EmployeesFacade {
  private readonly _employees = signal<Employee[]>(MOCK_EMPLOYEES);

  readonly employees = this._employees.asReadonly();
  readonly totalCount = computed(() => this._employees().length);

  readonly departments = computed(() => [
    ...new Set(this._employees().map((e) => e.department)),
  ]);

  getById(id: string): Employee | undefined {
    return this._employees().find((e) => e.id === id);
  }

  managerOf(employee: Employee): Employee | undefined {
    return employee.managerId ? this.getById(employee.managerId) : undefined;
  }

  reportsOf(managerId: string): Employee[] {
    return this._employees().filter((e) => e.managerId === managerId);
  }

  readonly orgTree = computed<OrgNode[]>(() => {
    const all = this._employees();
    const build = (managerId: string | null): OrgNode[] =>
      all
        .filter((e) => e.managerId === managerId)
        .map((employee) => ({ employee, reports: build(employee.id) }));
    return build(null);
  });

  update(updated: Employee): void {
    this._employees.update((list) =>
      list.map((e) => (e.id === updated.id ? { ...updated } : e)),
    );
  }
}

/** Wires the read-only facade to the concrete store for consumers (e.g. the dashboard). */
export function provideEmployeesData(): Provider[] {
  return [{ provide: EmployeesFacade, useExisting: EmployeesStore }];
}
