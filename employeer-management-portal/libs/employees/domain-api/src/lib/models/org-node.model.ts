import { Employee } from './employee.model';

/** A node in the manager → reports organisation tree. */
export interface OrgNode {
  employee: Employee;
  reports: OrgNode[];
}
