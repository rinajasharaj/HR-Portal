export type EmployeeStatus = 'active' | 'on-leave' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  startDate: string; // ISO date, e.g. '2022-03-01'
  managerId: string | null;
  status: EmployeeStatus;
}
