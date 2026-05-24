/**
 * Overseer type system � centralized definitions for the analysis pipeline.
 *
 * All timestamp fields use {@link ISOTimestamp} (ISO-8601 UTC).
 * All identifier fields use branded aliases for clarity.
 */

/* --------- Timestamps & Identifiers --------- */

/** ISO-8601 UTC timestamp, e.g. "2025-01-15T12:30:00.000Z". */
export type ISOTimestamp = string;

/** Unique identifier for a single agent finding. */
export type FindingId = string;

/** Unique identifier for a prioritized task. */
export type TaskId = string;

/* --------- Literal unions / Enums --------- */

/** Depth of analysis: 1 = report, 2 = tasks, 3 = reserved (paid). */
export type AnalysisLevel = 1 | 2 | 3;

/** Well-known agent identifiers. */
export type AgentId =
  | "architect"
  | "qa-risk"
  | "security-permissions"
  | "cybersecurity"
  | "firebase-devops"
  | "product-ux";

/** Severity of an agent finding, ordered from least to most critical. */
export type FindingSeverity = "info" | "low" | "medium" | "high";

/** Numeric weight per severity for sorting (info=1 � high=4). */
export const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
} as const;

/** Priority for task ordering. */
export type TaskPriority = "low" | "medium" | "high";

/** Lifecycle state of a prioritized task. */
export type TaskStatus = "todo" | "blocked";

/* --------- Project snapshot --------- */

/** Summary of a single file or directory inside the project. */
export interface ProjectFileSummary {
  path: string;
  type: "file" | "directory";
  extension?: string;
  sizeBytes?: number;
}

/**
 * Conteudo bruto de arquivos de configuracao publica do projeto.
 * Apenas configs nao sensiveis sao lidas (package.json, firebase.json,
 * firestore.rules, storage.rules, .gitignore, tsconfig.json, eslint.config.*).
 * Arquivos como .env, *.pem, *.key, serviceAccount*.json NUNCA sao lidos.
 */
export interface ProjectConfigs {
  packageJson?: string;
  packageLockJson?: string;
  firebaseJson?: string;
  firestoreRules?: string;
  storageRules?: string;
  gitignore?: string;
  tsconfigJson?: string;
  eslintConfig?: string;
  ciWorkflows: string[];
}

/**
 * Immutable snapshot of the project's filesystem at scan time.
 * All fields are always present; defaults use empty arrays / "unknown".
 */
export interface ProjectSnapshot {
  rootPath: string;
  files: ProjectFileSummary[];
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  detectedFrameworks: string[];
  hasTests: boolean;
  hasReadme: boolean;
  notes: string[];
  configs?: ProjectConfigs;
}

/** Contract for any filesystem scanner implementation. */
export interface ProjectScanner {
  scan(rootPath: string): Promise<ProjectSnapshot>;
}

/* --------- Agent model --------- */

/** Static definition of an analysis agent. */
export interface AgentDefinition {
  id: AgentId;
  name: string;
  focus: string;
  enabledLevels: AnalysisLevel[];
}

/** A single finding reported by an agent. */
export interface AgentFinding {
  id: FindingId;
  severity: FindingSeverity;
  title: string;
  detail: string;
  recommendation: string;
  /** Agent that originated this finding (set when the finding is attributed). */
  sourceAgent?: AgentId;
}

/** Consolidated feedback from one agent for a given snapshot. */
export interface AgentFeedback {
  agentId: AgentId;
  agentName: string;
  summary: string;
  positives: string[];
  findings: AgentFinding[];
}

/* --------- Analysis report (Level 1) --------- */

/** Level-1 analysis report produced by the orchestrator. */
export interface AnalysisReport {
  level: 1;
  projectPath: string;
  generatedAt: ISOTimestamp;
  snapshot: ProjectSnapshot;
  feedback: AgentFeedback[];
  consolidatedSummary: string;
}

/* --------- Prioritized tasks (Level 2) --------- */

/** A single actionable task derived from a Level-1 report. */
export interface PrioritizedTask {
  id: TaskId;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  sourceAgentId?: AgentId;
  rationale: string;
}

/** Ordered list of tasks produced by the Level-2 pipeline. */
export interface PrioritizedTaskList {
  level: 2;
  projectPath: string;
  generatedAt: ISOTimestamp;
  basedOnReportGeneratedAt?: ISOTimestamp;
  tasks: PrioritizedTask[];
  summary: string;
}

/* --------- Report writer contract --------- */

/** Abstraction for persisting analysis results. */
export interface ReportWriter {
  writeReport(report: AnalysisReport): Promise<void> | void;
  writeTasks?(tasks: PrioritizedTaskList): Promise<void> | void;
}

/* --------- Request & Orchestrator result --------- */

/** Input for the orchestrator pipeline. */
export interface AnalysisRequest {
  level: AnalysisLevel;
  projectPath: string;
  snapshot?: ProjectSnapshot;
  previousReport?: AnalysisReport;
}

/** Discriminated union returned by the orchestrator. */
export type OrchestratorResult =
  | { kind: "report"; report: AnalysisReport }
  | { kind: "tasks"; tasks: PrioritizedTaskList }
  | { kind: "blocked"; reason: string };
