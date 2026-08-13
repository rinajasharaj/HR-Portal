import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-leave-summary',
  imports: [CommonModule],
  templateUrl: './leave-summary.html',
  styleUrl: './leave-summary.css',
})
export class LeaveSummary {
  leaveDays = input.required<number>();
  totalWorkingDays = input.required<number>(); // this will come from time domain
}
