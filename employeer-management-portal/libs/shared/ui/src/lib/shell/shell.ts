import { Component, input } from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import { TuiBreadcrumbs } from '@taiga-ui/kit';
import { NavItem } from '../models/nav-items';
import { TuiItem } from "@taiga-ui/cdk";

@Component({
  selector: 'lib-shell',
  imports: [RouterOutlet, TuiBreadcrumbs, TuiItem, RouterLink, TuiItem],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  navItems = input<NavItem[]>([]);
  breadcrumbs = input<string[]>([]);
}
