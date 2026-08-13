import {Component, input} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html'
})
export class ButtonComponent {
  label = input<string>('Click me');
  variant = input<'primary' | 'secondary'>('primary');
}
