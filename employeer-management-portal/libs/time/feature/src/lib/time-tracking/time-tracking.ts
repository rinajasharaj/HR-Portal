import { Component, signal } from '@angular/core';

interface DailyHours {
  day: string;
  hours: number;
}

@Component({
  selector: 'lib-time-tracking',
  imports: [],
  templateUrl: './time-tracking.html',
  styleUrl: './time-tracking.css',
})
export class TimeTracking {
  dailyHours = signal<DailyHours[]>([
    { day: 'Monday', hours: 8 },
    { day: 'Tuesday', hours: 7.5 },
    { day: 'Wednesday', hours: 8 },
    { day: 'Thursday', hours: 6 },
    { day: 'Friday', hours: 8 },
  ]);
}
