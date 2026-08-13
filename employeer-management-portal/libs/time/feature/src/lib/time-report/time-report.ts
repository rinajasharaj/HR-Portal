import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveSummary } from '@employeer-management-portal/leave-domain-api';

@Component({
  selector: 'lib-time-report',
  imports: [CommonModule, LeaveSummary],
  templateUrl: './time-report.html',
  styleUrl: './time-report.css',
})
export class TimeReport {

}
