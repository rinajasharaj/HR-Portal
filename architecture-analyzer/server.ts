import express from 'express';
import cors from 'cors';
import { runAnalysis } from './run-analysis';
import { getAllRuns, getRunById } from './db';
import { execSync } from 'node:child_process';

const app = express();
app.use(cors());
app.use(express.json());

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

app.get('/analyze/live', async (req, res) => {
    try {
        console.log('Regenerating the graph from the current workspace...');
        execSync('npx nx graph --file=graph-output.json', {
            cwd: '../employeer-management-portal',
            stdio: 'inherit',
        });

        const results = await runAnalysis('../employeer-management-portal/graph-output.json');
        res.json(results);
    } catch (err) {
        console.error('Live analysis failed:', err);
        res.status(500).json({ error: 'Live analysis failed', detail: String(err) });
    }
});


app.get('/analyze/:state', async (req, res) => {
    const state = req.params.state;

    const graphFiles: Record<string, string> = {
        't0': '../employeer-management-portal/graph-output-t0.json',
        't1': '../employeer-management-portal/graph-output-t1.json',
        't2': '../employeer-management-portal/graph-output-t2.json'
    };

    const graphPath = graphFiles[state];

    if (!graphPath) {
        res.status(400).json({ error: 'Unknown state. Use t0, t1, or t2.' });
        return;
    }

    console.log('Analyzing state:', state);
    const results = await runAnalysis(graphPath);
    res.json(results);
});

app.get('/runs', (req, res) => {
    res.json(getAllRuns());
});

app.get('/runs/:id', (req, res) => {
    const run = getRunById(Number(req.params.id));

    if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
    }

    res.json({
        id: run.id,
        createdAt: run.created_at,
        graphPath: run.graph_path,
        findingCount: run.finding_count,
        results: JSON.parse(run.results_json),
    });
});