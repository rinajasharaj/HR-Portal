/**
 * Where the analysed Nx workspace sits and what the graph snapshot is called.
 * All paths are relative to the analyzer's working directory, so every entry
 * point must run from the `architecture-analyzer/` folder.
 */
export const WORKSPACE_ROOT = '../employeer-management-portal';

/** Filename passed to `nx graph --file=` and read back afterwards. */
export const GRAPH_FILE = 'graph-output.json';

/** Full path to the freshly generated graph snapshot. */
export const GRAPH_PATH = `${WORKSPACE_ROOT}/${GRAPH_FILE}`;
