import { extname } from "node:path";

import { generateStaticFeedback, routeAgents } from "./agent-router.js";
import type {
  AgentFinding,
  AgentId,
  AnalysisReport,
  AnalysisRequest,
  ISOTimestamp,
  OrchestratorResult,
  PrioritizedTask,
  PrioritizedTaskList,
  ProjectScanner,
  ProjectSnapshot,
  TaskPriority,
} from "../types/index.js";
import { SEVERITY_WEIGHT } from "../types/index.js";
import type { ProjectScan } from "./project-scanner.js";

/* --------- Scope helpers --------- */

export type CheckupScope =
  | "completo"
  | "arquitetura"
  | "qa"
  | "seguranca"
  | "cybersec"
  | "firebase"
  | "produto";

export type RunCheckupInput = {
  projectRoot: string;
  scope?: CheckupScope;
  scan?: ProjectScan | ProjectSnapshot;
};

/* --------- Type guard --------- */

/** Narrow a union of `ProjectScan | ProjectSnapshot` to `ProjectSnapshot`. */
function isProjectSnapshot(value: ProjectScan | ProjectSnapshot): value is ProjectSnapshot {
  return "rootPath" in value;
}

/* --------- Public entry points --------- */

export async function runCheckup(input: RunCheckupInput): Promise<AnalysisReport> {
  const snapshot = normalizeSnapshot(input.projectRoot, input.scan);
  const report = buildLevelOneReport(input.projectRoot, snapshot);

  if (input.scope && input.scope !== "completo") {
    const allowedAgent = scopeToAgent(input.scope);
    report.feedback = report.feedback.filter(
      (feedback) => feedback.agentId === allowedAgent,
    );
    report.consolidatedSummary = `Checkup Nivel 1 (${input.scope}) concluido com ${report.feedback.length} agente(s).`;
  }

  return report;
}

export async function runOrchestrator(
  request: AnalysisRequest,
  scanner?: ProjectScanner,
): Promise<OrchestratorResult> {
  if (request.level === 3) {
    return {
      kind: "blocked",
      reason:
        "Nivel 3 esta documentado como pago e bloqueado nesta versao. Nenhuma execucao foi realizada.",
    };
  }

  if (request.level === 2) {
    return {
      kind: "tasks",
      tasks: buildLevelTwoTasks(request),
    };
  }

  const snapshot = await resolveSnapshot(request, scanner);

  return {
    kind: "report",
    report: buildLevelOneReport(request.projectPath, snapshot),
  };
}

/* --------- Level-1 Report --------- */

export function buildLevelOneReport(
  projectPath: string,
  snapshot: ProjectSnapshot,
  now: Date = new Date(),
): AnalysisReport {
  const agents = routeAgents(1);
  const feedback = agents.map((agent) => generateStaticFeedback(agent, snapshot));
  const totalFindings = feedback.reduce(
    (sum, agentFeedback) => sum + agentFeedback.findings.length,
    0,
  );

  const generatedAt: ISOTimestamp = now.toISOString();

  return {
    level: 1,
    projectPath,
    generatedAt,
    snapshot,
    feedback,
    consolidatedSummary:
      totalFindings === 0
        ? "Checkup Nivel 1 concluido com feedback heuristico local e sem riscos relevantes no snapshot disponivel."
        : `Checkup Nivel 1 concluido com ${totalFindings} ponto(s) de atencao identificados por agentes locais.`,
  };
}

/* --------- Level-2 Tasks --------- */

export function buildLevelTwoTasks(
  request: AnalysisRequest,
  now: Date = new Date(),
): PrioritizedTaskList {
  if (!request.previousReport) {
    return {
      level: 2,
      projectPath: request.projectPath,
      generatedAt: now.toISOString(),
      tasks: [
        {
          id: "task-require-level-1-report",
          title: "Gerar relatorio de Nivel 1 antes do planejamento",
          priority: "high",
          status: "blocked",
          rationale:
            "O Nivel 2 deve priorizar tarefas com base no ultimo relatorio consolidado, mas nenhum relatorio anterior foi informado.",
        },
      ],
      summary:
        "Planejamento bloqueado porque nao ha relatorio de Nivel 1 para usar como base.",
    };
  }

  const tasks = request.previousReport.feedback
    .flatMap((feedback) =>
      feedback.findings.map((finding) =>
        findingToTask(finding, feedback.agentId),
      ),
    )
    .sort(compareTasks);

  return {
    level: 2,
    projectPath: request.projectPath,
    generatedAt: now.toISOString(),
    basedOnReportGeneratedAt: request.previousReport.generatedAt,
    tasks,
    summary:
      tasks.length === 0
        ? "Nenhuma tarefa priorizada foi gerada porque o ultimo relatorio nao contem pontos de atencao."
        : `Foram geradas ${tasks.length} tarefa(s) priorizadas a partir do ultimo relatorio.`,
  };
}

/* --------- Snapshot resolution --------- */

async function resolveSnapshot(
  request: AnalysisRequest,
  scanner?: ProjectScanner,
): Promise<ProjectSnapshot> {
  if (request.snapshot) {
    return request.snapshot;
  }

  if (scanner) {
    return scanner.scan(request.projectPath);
  }

  return emptySnapshot(request.projectPath);
}

function emptySnapshot(rootPath: string): ProjectSnapshot {
  return {
    rootPath,
    files: [],
    packageManager: "unknown",
    detectedFrameworks: [],
    hasTests: false,
    hasReadme: false,
    notes: [
      "Snapshot minimo gerado pelo orquestrador porque nenhum scanner foi informado.",
    ],
    configs: { ciWorkflows: [] },
  };
}

/* --------- Finding ? Task conversion --------- */

function findingToTask(
  finding: AgentFinding,
  sourceAgentId: AgentId | undefined,
): PrioritizedTask {
  return {
    id: `task-${finding.id}`,
    title: finding.recommendation,
    priority: severityToPriority(finding.severity),
    status: "todo",
    sourceAgentId,
    rationale: `${finding.title}: ${finding.detail}`,
  };
}

function severityToPriority(severity: AgentFinding["severity"]): TaskPriority {
  if (SEVERITY_WEIGHT[severity] >= SEVERITY_WEIGHT.high) return "high";
  if (SEVERITY_WEIGHT[severity] >= SEVERITY_WEIGHT.medium) return "medium";
  return "low";
}

function compareTasks(a: PrioritizedTask, b: PrioritizedTask): number {
  return priorityWeight(b.priority) - priorityWeight(a.priority);
}

function priorityWeight(priority: TaskPriority): number {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

/* --------- Snapshot normalization (ProjectScan ? ProjectSnapshot) --------- */

function normalizeSnapshot(
  projectRoot: string,
  scan?: ProjectScan | ProjectSnapshot,
): ProjectSnapshot {
  if (!scan) {
    return emptySnapshot(projectRoot);
  }

  if (isProjectSnapshot(scan)) {
    return scan;
  }

  // scan is ProjectScan � convert to ProjectSnapshot
  const files = scan.entries.map((entry) => ({
    path: entry.path,
    type: entry.type,
    extension: entry.type === "file" ? extname(entry.path) : undefined,
  }));
  const filePaths = files.map((file) => file.path.toLowerCase());

  return {
    rootPath: scan.rootDir,
    files,
    packageManager: detectPackageManager(filePaths),
    detectedFrameworks: detectFrameworks(filePaths),
    hasTests: filePaths.some(
      (file) =>
        file.includes(".test.") ||
        file.includes(".spec.") ||
        file.includes("/tests/") ||
        file.includes("/__tests__/"),
    ),
    hasReadme: filePaths.some((file) => file === "readme.md"),
    notes: scan.truncated
      ? ["Scanner atingiu o limite de entradas; a analise pode estar incompleta."]
      : [],
    configs: scan.configs,
  };
}

/* --------- Heuristic detectors --------- */

function detectPackageManager(
  filePaths: string[],
): ProjectSnapshot["packageManager"] {
  if (filePaths.includes("pnpm-lock.yaml")) return "pnpm";
  if (filePaths.includes("yarn.lock")) return "yarn";
  if (filePaths.includes("bun.lockb")) return "bun";
  if (filePaths.includes("package-lock.json") || filePaths.includes("package.json")) {
    return "npm";
  }
  return "unknown";
}

function detectFrameworks(filePaths: string[]): string[] {
  const frameworks = new Set<string>();

  if (filePaths.includes("firebase.json") || filePaths.includes(".firebaserc")) {
    frameworks.add("firebase");
  }
  if (filePaths.includes("next.config.js") || filePaths.includes("next.config.ts")) {
    frameworks.add("next");
  }
  if (filePaths.includes("vite.config.js") || filePaths.includes("vite.config.ts")) {
    frameworks.add("vite");
  }

  return [...frameworks];
}

/* --------- Scope ? Agent mapping --------- */

function scopeToAgent(scope: CheckupScope): AgentId {
  switch (scope) {
    case "arquitetura":
      return "architect";
    case "qa":
      return "qa-risk";
    case "seguranca":
      return "security-permissions";
    case "cybersec":
      return "cybersecurity";
    case "firebase":
      return "firebase-devops";
    case "produto":
      return "product-ux";
    case "completo":
      return "architect";
  }
}
