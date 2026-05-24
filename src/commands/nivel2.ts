import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  OVERSEER_DIR,
  assertInsideOverseer,
  validateProjectRoot,
  validateReportExists,
  SecurityError,
} from "../core/path-guards.js";

export type Nivel2Task = {
  priority: "alta" | "media" | "baixa";
  title: string;
  source: string;
};

export type Nivel2Result = {
  ok: boolean;
  message: string;
  reportPath?: string;
  tasks: Nivel2Task[];
};

const REPORTS_DIR = join(OVERSEER_DIR, "reports");

// ---------------------------------------------------------------------------
// Task extraction
// ---------------------------------------------------------------------------

function buildTasks(reportPath: string): Nivel2Task[] {
  const content = readFileSync(reportPath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

  const candidates =
    lines.length > 0 ? lines : ["Revisar achados do relatorio de Nivel 1"];

  return candidates.slice(0, 20).map((line, index) => {
    const text = line.toLowerCase();
    const priority =
      text.includes("critico") ||
      text.includes("crítico") ||
      text.includes("alto") ||
      text.includes("seguranca") ||
      text.includes("segurança")
        ? "alta"
        : text.includes("medio") ||
            text.includes("médio") ||
            text.includes("atencao") ||
            text.includes("atenção")
          ? "media"
          : "baixa";

    return {
      priority,
      title: `${index + 1}. ${line}`,
      source: reportPath,
    };
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderTasks(tasks: Nivel2Task[], sourceReport: string): string {
  const groups: Nivel2Task["priority"][] = ["alta", "media", "baixa"];
  const body = groups
    .map((priority) => {
      const items = tasks.filter((task) => task.priority === priority);
      const lines =
        items.length > 0
          ? items.map((task) => `- [ ] ${task.title}`)
          : ["- Nenhuma tarefa identificada."];

      return [`## Prioridade ${priority}`, "", ...lines].join("\n");
    })
    .join("\n\n");

  return [
    "# Tarefas Priorizadas - Nivel 2",
    "",
    `Relatorio base: ${sourceReport}`,
    "",
    "Este arquivo foi gerado dentro de .overseer/reports e nao altera arquivos do projeto analisado.",
    "",
    body,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runNivel2(projectRoot = process.cwd()): Nivel2Result {
  try {
    // --- Security: validate project root ---
    validateProjectRoot(projectRoot);

    const reportsDir = join(projectRoot, REPORTS_DIR);

    // --- Security: reports dir and output must be inside .overseer/ ---
    assertInsideOverseer(projectRoot, reportsDir);

    // --- Security: Nivel 2 depends on a valid Nivel 1 report ---
    const nivel1Validation = validateReportExists(projectRoot, 1);
    if (!nivel1Validation.ok) {
      return {
        ok: false,
        message: `Nivel 2 bloqueado: ${nivel1Validation.message}`,
        tasks: [],
      };
    }

    const nivel1Report = nivel1Validation.reportPath;

    mkdirSync(reportsDir, { recursive: true });

    const tasks = buildTasks(nivel1Report).sort((a, b) => {
      const order = { alta: 0, media: 1, baixa: 2 };
      return order[a.priority] - order[b.priority];
    });

    const outputPath = join(
      reportsDir,
      `nivel2-tarefas-${new Date().toISOString().replace(/[:.]/g, "-")}.md`
    );

    assertInsideOverseer(projectRoot, outputPath);

    writeFileSync(outputPath, renderTasks(tasks, nivel1Report), {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      message: "Tarefas priorizadas de Nivel 2 geradas em .overseer/reports.",
      reportPath: outputPath,
      tasks,
    };
  } catch (error) {
    if (error instanceof SecurityError) {
      return {
        ok: false,
        message: `Seguranca: ${error.message}`,
        tasks: [],
      };
    }
    throw error;
  }
}

export default runNivel2;
