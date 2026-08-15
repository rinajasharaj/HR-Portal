export type LeaveType = 'vacation' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  leaveType: LeaveType;
  reason: string;
  status: LeaveStatus;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  entitled: number;
  used: number;
}
