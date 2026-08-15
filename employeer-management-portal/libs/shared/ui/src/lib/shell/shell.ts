import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TuiBreadcrumbs } from '@taiga-ui/kit';
import { NavItem } from '../models/nav-items';
import { TuiItem } from '@taiga-ui/cdk';
import { TuiButton } from '@taiga-ui/core';
import { CurrentUserService } from '../current-user/current-user.service';

@Component({
  selector: 'lib-shell',
  imports: [
    RouterOutlet,
    TuiBreadcrumbs,
    TuiItem,
    RouterLink,
    RouterLinkActive,
    TuiButton,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  navItems = input<NavItem[]>([]);
  breadcrumbs = input<string[]>([]);

  protected readonly user = inject(CurrentUserService);
}
