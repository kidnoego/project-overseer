import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

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

/** Tamanho maximo lido por arquivo de config (defesa contra leitura abusiva). */
const MAX_CONFIG_BYTES = 256 * 1024;

/**
 * Configs publicas que o scanner pode ler. Arquivos sensiveis (.env,
 * *.pem, *.key, serviceAccount*.json) NUNCA aparecem aqui.
 */
const READABLE_CONFIGS = {
  packageJson: ["package.json"],
  packageLockJson: ["package-lock.json"],
  firebaseJson: ["firebase.json"],
  firestoreRules: ["firestore.rules"],
  storageRules: ["storage.rules"],
  gitignore: [".gitignore"],
  tsconfigJson: ["tsconfig.json"],
  eslintConfig: [
    "eslint.config.js",
    "eslint.config.cjs",
    "eslint.config.mjs",
    "eslint.config.ts",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
  ],
} as const;

const CI_WORKFLOW_DIRS = [".github/workflows", ".gitlab-ci"];

export type ProjectEntry = {
  path: string;
  type: "file" | "directory";
};

export type ProjectConfigs = {
  packageJson?: string;
  packageLockJson?: string;
  firebaseJson?: string;
  firestoreRules?: string;
  storageRules?: string;
  gitignore?: string;
  tsconfigJson?: string;
  eslintConfig?: string;
  ciWorkflows: string[];
};

export type ProjectScan = {
  rootDir: string;
  scannedAt: string;
  entries: ProjectEntry[];
  truncated: boolean;
  configs: ProjectConfigs;
};

export async function scanProject(rootDir: string, maxEntries = 1000): Promise<ProjectScan> {
  const entries: ProjectEntry[] = [];
  await walk(rootDir, rootDir, entries, maxEntries);

  const configs = await readConfigs(rootDir, entries);

  return {
    rootDir,
    scannedAt: new Date().toISOString(),
    entries,
    truncated: entries.length >= maxEntries,
    configs,
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

async function readConfigs(rootDir: string, entries: ProjectEntry[]): Promise<ProjectConfigs> {
  const presentFilePaths = new Set(
    entries.filter((e) => e.type === "file").map((e) => e.path)
  );

  const configs: ProjectConfigs = { ciWorkflows: [] };

  for (const [key, candidates] of Object.entries(READABLE_CONFIGS)) {
    for (const candidate of candidates) {
      if (presentFilePaths.has(candidate)) {
        const content = await safeReadConfig(rootDir, candidate);
        if (content !== undefined) {
          (configs as Record<string, unknown>)[key] = content;
        }
        break;
      }
    }
  }

  for (const ciDir of CI_WORKFLOW_DIRS) {
    for (const entry of entries) {
      if (
        entry.type === "file" &&
        entry.path.startsWith(`${ciDir}/`) &&
        [".yml", ".yaml"].includes(extname(entry.path).toLowerCase())
      ) {
        configs.ciWorkflows.push(entry.path);
      }
    }
  }

  return configs;
}

/**
 * Le um arquivo de config com limite de tamanho e captura de erro silencioso.
 * Nunca lanca: se nao puder ler, retorna undefined e o agente trata como "nao
 * disponivel". Isso garante que falha de IO nao quebra o checkup.
 */
async function safeReadConfig(rootDir: string, relativePath: string): Promise<string | undefined> {
  try {
    const fullPath = join(rootDir, relativePath);
    const info = await stat(fullPath);
    if (!info.isFile()) return undefined;
    if (info.size > MAX_CONFIG_BYTES) return undefined;
    return await readFile(fullPath, "utf8");
  } catch {
    return undefined;
  }
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
