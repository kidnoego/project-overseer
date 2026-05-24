import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { ProjectScan } from "./project-scanner.js";

export type ReportInput = {
  title: string;
  command: string[];
  project: ProjectScan;
  notes: string[];
  summary?: string;
  risks?: string[];
  recommendations?: string[];
  responsibleAgent?: string;
  data?: unknown;
};

export type ReportResult = {
  path: string;
};

export async function writeReport(rootDir: string, input: ReportInput): Promise<ReportResult> {
  const overseerDir = resolve(rootDir, ".overseer");
  const reportsDir = resolve(overseerDir, "reports");
  assertInsideOverseer(overseerDir, reportsDir);

  await mkdir(reportsDir, { recursive: true });

  const generatedAt = new Date();
  const filename = `${toTimestamp(generatedAt)}-${slug(input.title)}.md`;
  const reportPath = resolve(reportsDir, filename);

  assertInsideOverseer(overseerDir, reportPath);

  await writeFile(reportPath, renderMarkdownReport(input, generatedAt), "utf8");

  return {
    path: reportPath
  };
}

function renderMarkdownReport(input: ReportInput, generatedAt: Date): string {
  const responsibleAgent = input.responsibleAgent?.trim() || "overseer";
  const summary = input.summary?.trim() || firstUsefulNote(input.notes) || "Nenhum resumo informado.";
  const risks = normalizeList(input.risks, ["Nenhum risco critico identificado."]);
  const recommendations = normalizeList(input.recommendations, ["Manter acompanhamento nas proximas execucoes."]);
  const notes = normalizeList(input.notes, ["Sem notas adicionais."]);
  const generatedIso = generatedAt.toISOString();

  return [
    `# ${input.title}`,
    "",
    "## Resumo",
    summary,
    "",
    "## Riscos",
    renderList(risks),
    "",
    "## Recomendacoes",
    renderList(recommendations),
    "",
    "## Timestamps",
    `- Gerado em: ${generatedIso}`,
    `- Arquivo: ${toTimestamp(generatedAt)}`,
    "",
    "## Agente responsavel",
    responsibleAgent,
    "",
    "## Comando",
    `\`${input.command.join(" ")}\``,
    "",
    "## Projeto",
    "```json",
    JSON.stringify(input.project, null, 2),
    "```",
    "",
    "## Notas",
    renderList(notes),
    "",
    "## Dados adicionais",
    "```json",
    JSON.stringify(input.data ?? null, null, 2),
    "```",
    ""
  ].join("\n");
}

function normalizeList(values: string[] | undefined, fallback: string[]): string[] {
  const normalized = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return normalized.length > 0 ? normalized : fallback;
}

function renderList(values: string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

function firstUsefulNote(notes: string[]): string | undefined {
  return notes.map((note) => note.trim()).find(Boolean);
}

function assertInsideOverseer(overseerDir: string, targetPath: string): void {
  const location = relative(resolve(overseerDir), resolve(targetPath));

  if (location.startsWith("..") || isAbsolute(location)) {
    throw new Error("Report writer bloqueou escrita fora de .overseer/.");
  }
}

function toTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return normalized || "report";
}
