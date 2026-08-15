import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {Shell} from "@employeer-management-portal/shared-ui";

@Component({
  imports: [RouterModule, Shell],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
}
