import { Component, signal } from '@angular/core';
import { ButtonComponent, Card } from '@employeer-management-portal/shared-ui';

@Component({
  selector: 'lib-clock-in-out',
  imports: [ButtonComponent, Card],
  templateUrl: './clock-in-out.html',
  styleUrl: './clock-in-out.css',
})
export class ClockInOut {
  clockedIn = signal(false);
  clockInTime = signal('');

  clockIn() {
    this.clockInTime.set(new Date().toLocaleTimeString());
    this.clockedIn.set(true);
  }

  clockOut() {
    this.clockedIn.set(false);
  }
}
