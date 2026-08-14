import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {TuiInput, TuiTextfield} from '@taiga-ui/core';

@Component({
  selector: 'lib-input',
  imports: [FormsModule, TuiTextfield, TuiInput],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  label = input<string | null>(null);
  value = model<string>('');
}
