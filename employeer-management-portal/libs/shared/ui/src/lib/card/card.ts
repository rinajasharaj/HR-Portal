import { Component, input } from '@angular/core';
import { TuiCardLarge } from '@taiga-ui/layout';

@Component({
  selector: 'lib-card',
  imports: [TuiCardLarge],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  title = input<string>('');
}
