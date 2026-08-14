import {Component, signal} from '@angular/core';
import { RouterModule } from '@angular/router';
import {HttpClient} from "@angular/common/http";

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  loading = signal(false);
  results = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  analyze(state: string) {
    this.loading.set(true);
    this.results.set([]);

    this.http.get<any[]>(`http://localhost:3000/analyze/${state}`).subscribe((data) => {
      this.results.set(data);
      this.loading.set(false);
    });
  }
}
