import {Component, input} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-leave-status-badge',
  imports: [CommonModule],
  templateUrl: './leave-status-badge.component.html',
  styleUrl: './leave-status-badge.component.css',
})
export class LeaveStatusBadgeComponent {
  status = input<'pending' | 'approved' | 'rejected'>('pending');
}
