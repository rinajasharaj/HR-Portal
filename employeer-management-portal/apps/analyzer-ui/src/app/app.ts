import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Card, ButtonComponent } from '@employeer-management-portal/shared-ui';
import { AnalysisItem } from './models/analysis-item.model';

@Component({
  selector: 'app-root',
  imports: [Card, ButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly results = signal<AnalysisItem[]>([]);

  analyzeState(state: string): void {
    this.execute(`http://localhost:3000/analyze/${state}`);
  }

  analyzeLive(): void {
    this.execute('http://localhost:3000/analyze/live');
  }

  cardTitle(item: AnalysisItem): string {
    const subject =
      item.evidence.source ??
      item.evidence.library ??
      item.evidence.domainA ??
      '';
    return subject
      ? `${item.evidence.findingType} — ${subject}`
      : item.evidence.findingType;
  }

  private execute(url: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.results.set([]);

    this.http.get<AnalysisItem[]>(url).subscribe({
      next: (data) => {
        this.results.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Analysis failed. Is the backend running on port 3000?');
        this.loading.set(false);
      },
    });
  }
}
