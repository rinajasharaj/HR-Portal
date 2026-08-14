import express from 'express';
import cors from 'cors';
import { runAnalysis } from './run-analysis';

const app = express();
app.use(cors());
app.use(express.json());

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
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