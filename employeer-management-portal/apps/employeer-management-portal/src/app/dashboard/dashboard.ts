import { Component, computed } from '@angular/core';
import { Card } from '@employeer-management-portal/shared-ui';


@Component({
  selector: 'app-dashboard',
  imports: [Card],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // Mock values for now — in Phase 11 (database), these will come from real stored data
  employeeCount = computed(() => 6);
  pendingLeaveCount = computed(() => 2);
  hoursThisWeek = computed(() => 37.5);
}
