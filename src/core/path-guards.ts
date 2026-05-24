/**
 * path-guards.ts — Centralized filesystem security for the Overseer CLI.
 *
 * Responsibilities:
 *   1. Prevent path traversal (../, symlink escapes, absolute-path injection).
 *   2. Ensure every write targets only .overseer/ subtree.
 *   3. Validate that a required report exists before a dependent stage runs.
 *   4. Provide a read-only guard for stages that must never write.
 */

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The canonical subdirectory name that holds all Overseer data. */
export const OVERSEER_DIR = ".overseer";

/** Block-message returned by read-only stages (e.g. Nivel 3). */
export const NO_WRITE_BLOCK_MESSAGE =
  "Este estagio e somente leitura. Nenhuma escrita de arquivo e permitida.";

// ---------------------------------------------------------------------------
// Path traversal helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a path and rejects obvious traversal sequences **before**
 * `resolve()` has a chance to silently collapse them, giving callers a
 * clearer error.
 */
export function safeNormalize(rawPath: string): string {
  if (rawPath.trim().length === 0) {
    throw new SecurityError("Caminho vazio nao e permitido.");
  }

  // Reject null bytes
  if (rawPath.includes("\0")) {
    throw new SecurityError("Caminho contem byte nulo (\\0).");
  }

  // Reject double-dot traversal that would escape the project root
  const segments = rawPath.replace(/\\/g, "/").split("/");
  let depth = 0;
  for (const seg of segments) {
    if (seg === "..") {
      depth--;
    } else if (seg !== "." && seg !== "") {
      depth++;
    }
  }
  if (depth < 0) {
    throw new SecurityError(
      `Travessia de caminho detectada: "${rawPath}" escapa da raiz do projeto.`
    );
  }

  return normalize(rawPath);
}

/**
 * Returns `true` when `candidate` is inside (or equal to) `allowedParent`.
 * Both paths are resolved & resolved through `realpathSync` where possible
 * so symlinks cannot be used to escape.
 */
export function isInside(
  allowedParent: string,
  candidate: string
): boolean {
  const parentResolved = resolveSafe(allowedParent);
  const childResolved = resolveSafe(candidate);

  return isPathInsideResolved(parentResolved, childResolved);
}

/**
 * Resolves a path, following symlinks when possible.  Falls back to plain
 * `resolve()` if `realpathSync` fails (e.g. the file doesn't exist yet).
 */
function resolveSafe(p: string): string {
  try {
    return realpathSync(resolve(p));
  } catch {
    return resolve(p);
  }
}

function isPathInsideResolved(parentResolved: string, childResolved: string): boolean {
  const parent = normalize(parentResolved);
  const child = normalize(childResolved);

  return (
    child === parent ||
    child.startsWith(parent + "\\") ||
    child.startsWith(parent + "/")
  );
}

function assertNoSymlinkPath(pathToCheck: string, stopAt: string): void {
  const resolvedStop = resolve(stopAt);
  let current = resolve(pathToCheck);

  while (current !== resolvedStop) {
    if (existsSync(current)) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) {
        throw new SecurityError(`Caminho usa link simbolico nao permitido: "${current}".`);
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new SecurityError(`Caminho escapou do limite permitido: "${pathToCheck}".`);
    }
    current = parent;
  }
}

function resolveExistingParent(candidate: string): string {
  let current = resolve(candidate);
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }

  return realpathSync(current);
}

// ---------------------------------------------------------------------------
// Overseer-specific guards
// ---------------------------------------------------------------------------

/**
 * Ensures that `targetPath` falls **strictly** inside `<projectRoot>/.overseer/`.
 * Throws `SecurityError` otherwise.
 */
export function assertInsideOverseer(
  projectRoot: string,
  targetPath: string
): void {
  safeNormalize(targetPath);
  validateProjectRoot(projectRoot);

  const projectRootReal = realpathSync(resolve(projectRoot));
  const overseerRoot = join(projectRootReal, OVERSEER_DIR);
  const targetResolved = resolve(targetPath);

  if (isAbsolute(targetPath) && !isPathInsideResolved(projectRootReal, targetResolved)) {
    throw new SecurityError(
      `Caminho absoluto fora da raiz do projeto negado: "${targetPath}".`
    );
  }

  if (!isPathInsideResolved(overseerRoot, targetResolved)) {
    throw new SecurityError(
      `Escrita negada: "${targetPath}" esta fora de .overseer/. ` +
        `Todas as escritas devem ficar dentro de "${overseerRoot}".`
    );
  }

  if (existsSync(overseerRoot)) {
    const overseerStat = lstatSync(overseerRoot);
    if (!overseerStat.isDirectory() || overseerStat.isSymbolicLink()) {
      throw new SecurityError(
        `.overseer deve ser um diretorio real dentro do projeto: "${overseerRoot}".`
      );
    }
  } else if (dirname(targetResolved) !== projectRootReal && targetResolved !== overseerRoot) {
    throw new SecurityError(
      `.overseer ainda nao existe; crie primeiro o diretorio raiz em "${overseerRoot}".`
    );
  }

  assertNoSymlinkPath(targetResolved, projectRootReal);

  const existingParentReal = resolveExistingParent(targetResolved);
  const overseerReal = existsSync(overseerRoot) ? realpathSync(overseerRoot) : overseerRoot;
  if (
    existingParentReal !== projectRootReal &&
    !isPathInsideResolved(overseerReal, existingParentReal)
  ) {
    throw new SecurityError(
      `Escrita negada: "${targetPath}" esta fora de .overseer/. ` +
        `Todas as escritas devem ficar dentro de "${overseerRoot}".`
    );
  }
}

/**
 * Ensures `projectRoot` is a valid, existing, absolute directory.
 */
export function validateProjectRoot(projectRoot: string): void {
  safeNormalize(projectRoot);

  if (!isAbsolute(projectRoot)) {
    throw new SecurityError(
      `Raiz do projeto deve ser caminho absoluto: "${projectRoot}".`
    );
  }

  const stat = existsSync(projectRoot);
  if (!stat) {
    throw new SecurityError(
      `Diretorio do projeto nao existe: "${projectRoot}".`
    );
  }

  const rootStat = statSync(projectRoot);
  if (!rootStat.isDirectory()) {
    throw new SecurityError(
      `Raiz do projeto nao e um diretorio: "${projectRoot}".`
    );
  }
}

// ---------------------------------------------------------------------------
// Report existence validation
// ---------------------------------------------------------------------------

export type ReportValidationResult =
  | { ok: true; reportPath: string }
  | { ok: false; message: string };

/**
 * Validates that a report file for the given `nivel` (1, 2, …) exists
 * inside `.overseer/reports/`, is non-empty, and is a regular file
 * (not a symlink pointing elsewhere).
 *
 * Returns a discriminated union so callers never have to guess.
 */
export function validateReportExists(
  projectRoot: string,
  nivel: 1 | 2
): ReportValidationResult {
  try {
    validateProjectRoot(projectRoot);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof SecurityError
          ? error.message
          : "Raiz do projeto invalida.",
    };
  }

  const rootReal = realpathSync(resolve(projectRoot));
  const overseerDir = join(rootReal, OVERSEER_DIR);
  const reportsDir = join(overseerDir, "reports");

  if (existsSync(overseerDir)) {
    const overseerStat = lstatSync(overseerDir);
    if (!overseerStat.isDirectory() || overseerStat.isSymbolicLink()) {
      return {
        ok: false,
        message: `.overseer deve ser um diretorio real dentro do projeto: "${overseerDir}".`,
      };
    }
  }

  if (!existsSync(reportsDir)) {
    return {
      ok: false,
      message: `Diretorio de relatorios nao encontrado: "${reportsDir}". Execute "ovr init" e "ovr checkup" primeiro.`,
    };
  }

  const reportsStat = lstatSync(reportsDir);
  if (!reportsStat.isDirectory() || reportsStat.isSymbolicLink()) {
    return {
      ok: false,
      message: `Diretorio de relatorios invalido: "${reportsDir}".`,
    };
  }

  // Ensure reportsDir itself is safe
  if (!isInside(overseerDir, reportsDir)) {
    return {
      ok: false,
      message: "Diretorio de relatorios esta fora de .overseer/.",
    };
  }

  const patterns = nivel === 1
    ? ["nivel1", "nivel-1", "level1"]
    : ["nivel2", "nivel-2", "level2"];

  const searchDir = reportsDir;

  let found: string | null = null;

  try {
    const files = readdirSync(searchDir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);

    for (const name of files) {
      const lower = name.toLowerCase();

      // Filename match
      if (patterns.some((p) => lower.includes(p))) {
        const full = join(searchDir, name);
        // Ensure it's a real regular file and cannot escape .overseer/reports.
        try {
          const st = lstatSync(full);
          if (!st.isFile() || st.isSymbolicLink() || !isInside(reportsDir, full)) continue;
        } catch {
          continue;
        }

        // Ensure non-empty
        try {
          const content = readFileSync(full, "utf8");
          if (content.trim().length === 0) continue;
        } catch {
          continue;
        }

        found = full;
        break;
      }

      // Content-based match (only for .md / .txt / .json)
      if (/\.(md|txt|json)$/i.test(name)) {
        try {
          const full = join(searchDir, name);
          const st = lstatSync(full);
          if (!st.isFile() || st.isSymbolicLink() || !isInside(reportsDir, full)) continue;

          const content = readFileSync(full, "utf8").toLowerCase();
          const keywords = nivel === 1
            ? ["nivel 1", "nivel-1", "nível 1", "level 1"]
            : ["nivel 2", "nivel-2", "nível 2", "level 2"];
          if (keywords.some((kw) => content.includes(kw))) {
            found = full;
            break;
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    return {
      ok: false,
      message: "Erro ao listar relatorios.",
    };
  }

  if (!found) {
    const label = nivel === 1 ? "Nivel 1" : "Nivel 2";
    return {
      ok: false,
      message: `Nenhum relatorio de ${label} encontrado em "${reportsDir}". Execute os estagios anteriores primeiro.`,
    };
  }

  // Final path traversal check
  if (!isInside(reportsDir, found)) {
    return {
      ok: false,
      message: "Caminho do relatorio encontrado escapou de .overseer/reports.",
    };
  }

  return { ok: true, reportPath: found };
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}
