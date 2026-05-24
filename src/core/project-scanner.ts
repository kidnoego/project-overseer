import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".overseer",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage"
]);

export type ProjectEntry = {
  path: string;
  type: "file" | "directory";
};

export type ProjectScan = {
  rootDir: string;
  scannedAt: string;
  entries: ProjectEntry[];
  truncated: boolean;
};

export async function scanProject(rootDir: string, maxEntries = 500): Promise<ProjectScan> {
  const entries: ProjectEntry[] = [];
  await walk(rootDir, rootDir, entries, maxEntries);

  return {
    rootDir,
    scannedAt: new Date().toISOString(),
    entries,
    truncated: entries.length >= maxEntries
  };
}

async function walk(
  rootDir: string,
  currentDir: string,
  entries: ProjectEntry[],
  maxEntries: number
): Promise<void> {
  if (entries.length >= maxEntries) {
    return;
  }

  const directoryEntries = await readdir(currentDir, { withFileTypes: true });

  for (const directoryEntry of directoryEntries) {
    if (entries.length >= maxEntries) {
      return;
    }

    if (directoryEntry.isDirectory() && IGNORED_DIRECTORIES.has(directoryEntry.name)) {
      continue;
    }

    const fullPath = join(currentDir, directoryEntry.name);
    const relativePath = normalizePath(relative(rootDir, fullPath));

    if (directoryEntry.isDirectory()) {
      entries.push({ path: relativePath, type: "directory" });
      await walk(rootDir, fullPath, entries, maxEntries);
      continue;
    }

    if (directoryEntry.isFile()) {
      entries.push({ path: relativePath, type: "file" });
      continue;
    }

    const info = await stat(fullPath);
    if (info.isFile()) {
      entries.push({ path: relativePath, type: "file" });
    }
  }
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
