import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

// The database is a single file sitting next to the analyzer's source.
const DB_PATH = join(__dirname, 'analysis-history.db');

const db = new DatabaseSync(DB_PATH);

// One table. `results_json` stores the full analysis output as a text blob.
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    TEXT    NOT NULL,
    graph_path    TEXT    NOT NULL,
    finding_count INTEGER NOT NULL,
    results_json  TEXT    NOT NULL
  )
`);

export interface AnalysisRunRow {
    id: number;
    created_at: string;
    graph_path: string;
    finding_count: number;
    results_json: string;
}

export type AnalysisRunSummary = Omit<AnalysisRunRow, 'results_json'>;

/** Persist one analysis run. Returns the new row's id. */
export function saveRun(graphPath: string, results: unknown[]): number {
    const stmt = db.prepare(`
    INSERT INTO analysis_runs (created_at, graph_path, finding_count, results_json)
    VALUES (?, ?, ?, ?)
  `);
    const info = stmt.run(
        new Date().toISOString(),
        graphPath,
        results.length,
        JSON.stringify(results),
    );
    return Number(info.lastInsertRowid);
}

/** All runs, newest first, without the heavy JSON blob. */
export function getAllRuns(): AnalysisRunSummary[] {
    return db
        .prepare(`
      SELECT id, created_at, graph_path, finding_count
      FROM analysis_runs
      ORDER BY id DESC
    `)
        .all() as AnalysisRunSummary[];
}

/** One full run by id, including the parsed results. */
export function getRunById(id: number): AnalysisRunRow | undefined {
    return db
        .prepare(`SELECT * FROM analysis_runs WHERE id = ?`)
        .get(id) as AnalysisRunRow | undefined;
}