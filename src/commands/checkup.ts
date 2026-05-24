import fs from "node:fs/promises";
import path from "node:path";

import { runCheckup } from "../core/orchestrator.js";
import { scanProject } from "../core/project-scanner.js";
import { writeReport } from "../core/report-writer.js";

type CheckupScope =
  | "completo"
  | "arquitetura"
  | "qa"
  | "seguranca"
  | "cybersec"
  | "firebase"
  | "produto";

type CommandInput =
  | string[]
  | {
      scope?: string;
      cwd?: string;
      projectRoot?: string;
    };

type OverseerPaths = {
  root: string;
  reports: string;
  cache: string;
  memory: string;
};

const VALID_SCOPES: CheckupScope[] = [
  "completo",
  "arquitetura",
  "qa",
  "seguranca",
  "cybersec",
  "firebase",
  "produto",
];

const SCOPE_ALIASES: Record<string, CheckupScope> = {
  completo: "completo",
  complete: "completo",
  full: "completo",
  all: "completo",
  arquitetura: "arquitetura",
  architecture: "arquitetura",
  architect: "arquitetura",
  qa: "qa",
  risk: "qa",
  seguranca: "seguranca",
  security: "seguranca",
  cybersec: "cybersec",
  cybersecurity: "cybersec",
  cyber: "cybersec",
  firebase: "firebase",
  devops: "firebase",
  produto: "produto",
  product: "produto",
  ux: "produto",
};

function parseScope(input?: string): CheckupScope {
  if (!input || input.trim() === "") {
    return "completo";
  }

  const normalized = input.trim().toLowerCase();
  const scope = SCOPE_ALIASES[normalized];

  if (!scope) {
    throw new Error(
      `Escopo invalido "${input}". Use: ${VALID_SCOPES.join(", ")}.`,
    );
  }

  return scope;
}

function parseInput(input: CommandInput = process.argv.slice(2)): {
  projectRoot: string;
  scope: CheckupScope;
} {
  if (Array.isArray(input)) {
    const scopeArg = input.find((arg) => !arg.startsWith("-"));
    return {
      projectRoot: process.cwd(),
      scope: parseScope(scopeArg),
    };
  }

  return {
    projectRoot: input.projectRoot ?? input.cwd ?? process.cwd(),
    scope: parseScope(input.scope),
  };
}

async function ensureOverseerPaths(projectRoot: string): Promise<OverseerPaths> {
  const root = path.join(projectRoot, ".overseer");
  const paths = {
    root,
    reports: path.join(root, "reports"),
    cache: path.join(root, "cache"),
    memory: path.join(root, "memory"),
  };

  await Promise.all([
    fs.mkdir(paths.reports, { recursive: true }),
    fs.mkdir(paths.cache, { recursive: true }),
    fs.mkdir(paths.memory, { recursive: true }),
  ]);

  return paths;
}

export async function runCheckupCommand(
  input?: CommandInput,
): Promise<{ path: string }> {
  const { projectRoot, scope } = parseInput(input);
  const overseer = await ensureOverseerPaths(projectRoot);
  const scan = await scanProject(projectRoot);
  const report = await runCheckup({ projectRoot, scope, scan });

  return writeReport(projectRoot, {
    title: `Checkup Nivel 1 - ${scope}`,
    command: ["checkup", scope],
    project: scan,
    notes: [
      `Relatorio de Nivel 1 gerado para o escopo ${scope}.`,
      `Persistencia restrita a ${path.relative(projectRoot, overseer.reports)}.`,
      "A CLI nao alterou arquivos do projeto analisado fora de .overseer/.",
    ],
    data: report,
  });
}

export const checkup = runCheckupCommand;
export const checkupCommand = runCheckupCommand;
export default runCheckupCommand;
