import { WalkEntry, WalkOptions, walkSync } from "../deps.ts";

const PUBLIC_PATHS_OPTIONS: WalkOptions = {
  exts: [".ts", ".js", ".mjs"],
  skip: [/_/, /\.test/],
  maxDepth: 10,
  includeDirs: false,
};

export function getPublicFilePaths(directory: string) {
  const entries = walkSync(directory, PUBLIC_PATHS_OPTIONS);

  return Array.from(entries).map(getEntryPath);
}

function getEntryPath(entry: WalkEntry) {
  return entry.path;
}
