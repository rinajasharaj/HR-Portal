import { Routes } from '@angular/router';
import { LeaveRequestForm } from '@employeer-management-portal/leave-feature';
import { LeaveApprovalQueue } from '@employeer-management-portal/leave-feature';

export const routes: Routes = [
  { path: '', component: LeaveRequestForm },
  { path: 'approvals', component: LeaveApprovalQueue }
];
