import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [CommonModule, TuiButton],
  templateUrl: './button.component.html'
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'floating'>('primary');
  size = input<'s' | 'm' | 'l'>('s');
}
