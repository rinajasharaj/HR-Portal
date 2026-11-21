/**
 * Where the analysed Nx workspace sits and where graph snapshots live.
 * All paths are relative to the analyzer's working directory, so every entry
 * point must run from the `architecture-analyzer/` folder.
 */
export const WORKSPACE_ROOT = '../employeer-management-portal';

/** Committed, frozen Nx graph snapshots kept as thesis evidence. */
export const SNAPSHOTS_DIR = 'graph-snapshots';

/**
 * Transient graph snapshot — regenerated on every `npm run check`, gitignored.
 * `GRAPH_PATH` is where the analyzer reads it (relative to the analyzer cwd);
 * `GRAPH_FILE` is the same file as `nx graph --file=` needs to write it, since
 * that command runs from `WORKSPACE_ROOT`.
 */
export const GRAPH_PATH = '.cache/graph.json';
export const GRAPH_FILE = `../architecture-analyzer/${GRAPH_PATH}`;
