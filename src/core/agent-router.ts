import type {
  AgentDefinition,
  AgentFeedback,
  AgentFinding,
  AnalysisLevel,
  ProjectSnapshot,
} from "../types/index.js";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "architect",
    name: "Architect Agent",
    focus: "Arquitetura, modularidade e separacao de responsabilidades.",
    enabledLevels: [1, 2],
  },
  {
    id: "qa-risk",
    name: "QA Risk Agent",
    focus: "Bugs provaveis, fluxos quebrados, validacoes e regressao.",
    enabledLevels: [1, 2],
  },
  {
    id: "security-permissions",
    name: "Security & Permissions Agent",
    focus: "Riscos de seguranca, segredos e limites de permissao.",
    enabledLevels: [1, 2],
  },
  {
    id: "firebase-devops",
    name: "Firebase/DevOps Agent",
    focus: "Firebase, comandos locais, sandbox e riscos operacionais.",
    enabledLevels: [1, 2],
  },
  {
    id: "product-ux",
    name: "Product & UX Agent",
    focus: "Escopo, niveis do produto e consistencia da proposta.",
    enabledLevels: [1, 2],
  },
];

export function routeAgents(level: AnalysisLevel): AgentDefinition[] {
  if (level === 3) {
    return [];
  }

  return AGENT_DEFINITIONS.filter((agent) =>
    agent.enabledLevels.includes(level),
  );
}

export function generateStaticFeedback(
  agent: AgentDefinition,
  snapshot: ProjectSnapshot,
): AgentFeedback {
  const findings = getAgentFindings(agent.id, snapshot);

  return {
    agentId: agent.id,
    agentName: agent.name,
    summary: buildAgentSummary(agent.name, findings),
    positives: buildPositives(snapshot),
    findings,
  };
}

function buildAgentSummary(agentName: string, findings: AgentFinding[]): string {
  if (findings.length === 0) {
    return `${agentName} nao encontrou riscos relevantes com base no snapshot local disponivel.`;
  }

  return `${agentName} gerou feedback heuristico local com ${findings.length} ponto(s) de atencao.`;
}

function buildPositives(snapshot: ProjectSnapshot): string[] {
  const positives: string[] = [
    "Analise mantida em modo local, sem chamada a API externa.",
  ];

  if (snapshot.hasReadme) {
    positives.push("Projeto possui README, o que ajuda onboarding e revisao.");
  }

  if (snapshot.hasTests) {
    positives.push("Projeto indica presenca de testes.");
  }

  if ((snapshot.detectedFrameworks ?? []).length > 0) {
    positives.push(
      `Frameworks detectados: ${snapshot.detectedFrameworks?.join(", ")}.`,
    );
  }

  return positives;
}

function getAgentFindings(
  agentId: AgentDefinition["id"],
  snapshot: ProjectSnapshot,
): AgentFinding[] {
  switch (agentId) {
    case "architect":
      return architectFindings(snapshot);
    case "qa-risk":
      return qaFindings(snapshot);
    case "security-permissions":
      return securityFindings(snapshot);
    case "firebase-devops":
      return firebaseDevopsFindings(snapshot);
    case "product-ux":
      return productFindings(snapshot);
  }
}

function architectFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const fileCount = snapshot.files?.length ?? 0;

  if (fileCount === 0) {
    findings.push({
      id: "arch-no-file-index",
      severity: "medium",
      title: "Snapshot sem indice de arquivos",
      detail:
        "A analise arquitetural fica limitada quando o scanner nao informa arquivos do projeto.",
      recommendation:
        "Conectar um scanner local que entregue paths, extensoes e metadados basicos sem alterar o projeto.",
    });
  }

  if (fileCount > 250) {
    findings.push({
      id: "arch-large-project",
      severity: "medium",
      title: "Projeto possivelmente grande para analise linear",
      detail:
        "Um volume alto de arquivos pode exigir filtros por diretorio e tipo para evitar relatorios ruidosos.",
      recommendation:
        "Separar a analise por modulos e limitar agentes a areas relevantes do snapshot.",
    });
  }

  return findings;
}

function qaFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  if (snapshot.hasTests) {
    return [];
  }

  return [
    {
      id: "qa-no-tests-detected",
      severity: "medium",
      title: "Testes nao identificados no snapshot",
      detail:
        "A ausencia de sinais de testes aumenta o risco de regressao em mudancas futuras.",
      recommendation:
        "Validar no Nivel 2 quais fluxos principais precisam de cobertura primeiro.",
    },
  ];
}

function securityFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const sensitiveFiles = (snapshot.files ?? []).filter((file) =>
    [".env", ".pem", ".key"].some((token) => file.path.includes(token)),
  );

  if (sensitiveFiles.length === 0) {
    return [];
  }

  return [
    {
      id: "sec-sensitive-files",
      severity: "high",
      title: "Arquivos potencialmente sensiveis detectados",
      detail:
        "O snapshot lista arquivos que podem conter segredos ou credenciais.",
      recommendation:
        "Garantir que o orquestrador apenas reporte a existencia desses arquivos e nunca leia ou exponha seus conteudos.",
    },
  ];
}

function firebaseDevopsFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const hasFirebaseConfig = (snapshot.files ?? []).some((file) =>
    ["firebase.json", ".firebaserc"].includes(file.path),
  );

  if (hasFirebaseConfig) {
    return [];
  }

  return [
    {
      id: "devops-no-firebase-config",
      severity: "low",
      title: "Configuracao Firebase nao identificada",
      detail:
        "O snapshot nao encontrou firebase.json ou .firebaserc, entao a analise Firebase fica limitada.",
      recommendation:
        "Tratar achados Firebase como preliminares ate confirmar a stack real do projeto.",
    },
  ];
}

function productFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];

  if (!snapshot.hasReadme) {
    findings.push({
      id: "product-missing-readme",
      severity: "low",
      title: "README nao identificado",
      detail:
        "Sem README, a CLI tem menos contexto para explicar o produto e seus fluxos ao usuario.",
      recommendation:
        "Usar metadados do scanner e perguntas explicitas ao usuario quando a documentacao nao existir.",
    });
  }

  if ((snapshot.notes ?? []).length > 0) {
    findings.push({
      id: "prod-scanner-notes",
      severity: "info",
      title: "Notas do scanner disponiveis",
      detail:
        "O snapshot inclui observacoes que podem ajudar o orquestrador a explicar limites da analise.",
      recommendation:
        "Incluir notas relevantes no relatorio consolidado sem transforma-las automaticamente em tarefas.",
    });
  }

  return findings;
}
