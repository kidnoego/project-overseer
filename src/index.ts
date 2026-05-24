#!/usr/bin/env node

import { runCheckupCommand } from "./commands/checkup.js";
import { runInit } from "./commands/init.js";
import { runNivel2 } from "./commands/nivel2.js";
import { runNivel3 } from "./commands/nivel3.js";

type CommandResult = {
  exitCode: number;
  message?: string;
};

const CHECKUP_SCOPES = [
  "completo",
  "arquitetura",
  "qa",
  "seguranca",
  "firebase",
  "produto",
] as const;

type CheckupScope = (typeof CHECKUP_SCOPES)[number];

async function main(argv: string[]): Promise<CommandResult> {
  const [command, scope] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    return {
      exitCode: 0,
      message: usage(),
    };
  }

  if (command === "init") {
    const result = await runInit(process.cwd());
    return {
      exitCode: 0,
      message: formatSuccess(
        "Overseer inicializado",
        [
          `Config: ${result.configPath}`,
          `Diretorios locais: ${formatList(result.createdDirectories)}`,
          "Proximo passo: ovr checkup completo",
        ],
      ),
    };
  }

  if (command === "checkup") {
    const normalizedScope = scope ?? "completo";
    if (!isCheckupScope(normalizedScope)) {
      return {
        exitCode: 1,
        message: formatError(
          "Escopo de checkup invalido",
          [
            `Recebido: ${normalizedScope}`,
            `Use um destes escopos: ${CHECKUP_SCOPES.join(", ")}`,
            "Exemplo: ovr checkup arquitetura",
          ],
        ),
      };
    }

    const report = await runCheckupCommand({ scope: normalizedScope });

    return {
      exitCode: 0,
      message: formatSuccess(
        `Checkup Nivel 1 concluido (${normalizedScope})`,
        [
          `Relatorio local: ${report.path}`,
          "Nenhum arquivo do projeto analisado foi alterado.",
        ],
      ),
    };
  }

  if (command === "nivel2") {
    const result = runNivel2(process.cwd());
    return {
      exitCode: result.ok ? 0 : 1,
      message: result.ok
        ? formatSuccess(
            "Nivel 2 concluido",
            [
              result.message,
              result.reportPath ? `Arquivo local: ${result.reportPath}` : undefined,
            ],
          )
        : formatError(
            "Nivel 2 nao pode continuar",
            [
              result.message,
              "Execute primeiro: ovr checkup completo",
            ],
          ),
    };
  }

  if (command === "nivel3") {
    return {
      exitCode: 0,
      message: formatInfo(
        "Nivel 3 indisponivel nesta versao",
        [
          runNivel3(),
          "Nao ha checkout, SaaS, backend ou coleta remota nesta versao local.",
        ],
      ),
    };
  }

  return {
    exitCode: 1,
    message: formatError(
      "Comando desconhecido",
      [
        `Recebido: ${command}`,
        "Use: ovr help",
      ],
    ),
  };
}

function usage(): string {
  return [
    "Overseer CLI",
    "",
    "Checkups locais para avaliar arquitetura, QA, seguranca, Firebase/DevOps e produto sem enviar codigo para SaaS ou backend remoto.",
    "",
    "Uso:",
    "  ovr <comando>",
    "  ovr checkup [escopo]",
    "",
    "Comandos:",
    "  init                 Cria a estrutura local .overseer/",
    "  checkup              Executa Nivel 1 com escopo completo",
    "  checkup <escopo>     Executa Nivel 1 para um escopo especifico",
    "  nivel2               Organiza prioridades a partir do Nivel 1",
    "  nivel3               Mostra o bloqueio do Nivel 3 futuro",
    "  help                 Mostra esta ajuda",
    "",
    "Escopos do checkup:",
    `  ${CHECKUP_SCOPES.join(", ")}`,
    "",
    "Exemplos:",
    "  ovr init",
    "  ovr checkup completo",
    "  ovr checkup seguranca",
    "  ovr nivel2",
    "",
    "Saidas:",
    "  Relatorios ficam apenas na maquina local, dentro de .overseer/.",
    "  A CLI nao altera o codigo do projeto durante os niveis 1 e 2.",
  ].join("\n");
}

function isCheckupScope(scope: string): scope is CheckupScope {
  return CHECKUP_SCOPES.includes(scope as CheckupScope);
}

function formatSuccess(title: string, lines: Array<string | undefined>): string {
  return formatBlock("OK", title, lines);
}

function formatError(title: string, lines: Array<string | undefined>): string {
  return formatBlock("ERRO", title, lines);
}

function formatInfo(title: string, lines: Array<string | undefined>): string {
  return formatBlock("INFO", title, lines);
}

function formatBlock(label: string, title: string, lines: Array<string | undefined>): string {
  const details = lines.filter((line): line is string => Boolean(line));
  return [
    `[${label}] ${title}`,
    ...details.map((line) => `- ${line}`),
  ].join("\n");
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "nenhum novo diretorio";
}

main(process.argv.slice(2))
  .then((result) => {
    if (result.message) {
      const writer = result.exitCode === 0 ? console.log : console.error;
      writer(result.message);
    }
    process.exitCode = result.exitCode;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(formatError("Falha inesperada", [
      message,
      "A stack trace foi ocultada. Rode novamente com o comando desejado apos corrigir o ponto acima.",
    ]));
    process.exitCode = 1;
  });
