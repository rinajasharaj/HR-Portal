import { Routes } from '@angular/router';
import {
  MyLeaveRequests,
  LeaveRequestForm,
  LeaveApprovalQueue,
  LeaveBalanceView,
} from '@employeer-management-portal/leave-feature';

export const routes: Routes = [
  { path: '', component: MyLeaveRequests },
  { path: 'request', component: LeaveRequestForm },
  { path: 'approvals', component: LeaveApprovalQueue },
  { path: 'balance', component: LeaveBalanceView },
];
