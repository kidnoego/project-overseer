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
    focus: "Riscos no filesystem: arquivos sensiveis e permissoes de acesso.",
    enabledLevels: [1, 2],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity Agent",
    focus:
      "Vulnerabilidades de configuracao: secrets versionados, deps inseguras, regras abertas, scripts perigosos.",
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

  const counts = countSeverities(findings);
  const parts: string[] = [];
  if (counts.high > 0) parts.push(`${counts.high} alto(s)`);
  if (counts.medium > 0) parts.push(`${counts.medium} medio(s)`);
  if (counts.low > 0) parts.push(`${counts.low} baixo(s)`);
  if (counts.info > 0) parts.push(`${counts.info} info`);

  return `${agentName} gerou feedback heuristico local com ${findings.length} ponto(s) de atencao (${parts.join(", ")}).`;
}

function countSeverities(findings: AgentFinding[]): Record<AgentFinding["severity"], number> {
  const result = { info: 0, low: 0, medium: 0, high: 0 } as Record<AgentFinding["severity"], number>;
  for (const f of findings) result[f.severity]++;
  return result;
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

  if ((snapshot.configs?.ciWorkflows.length ?? 0) > 0) {
    positives.push(
      `Pipelines de CI detectados (${snapshot.configs?.ciWorkflows.length}).`,
    );
  }

  if (snapshot.configs?.eslintConfig) {
    positives.push("ESLint configurado.");
  }

  if (snapshot.configs?.tsconfigJson) {
    positives.push("TypeScript configurado (tsconfig.json).");
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
    case "cybersecurity":
      return cybersecurityFindings(snapshot);
    case "firebase-devops":
      return firebaseDevopsFindings(snapshot);
    case "product-ux":
      return productFindings(snapshot);
  }
}

/* ============================================================
 * Architect Agent
 * ============================================================ */

function architectFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const fileCount = snapshot.files?.length ?? 0;
  const filePaths = (snapshot.files ?? []).map((f) => f.path);

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

  if (fileCount > 800) {
    findings.push({
      id: "arch-large-project",
      severity: "medium",
      title: "Projeto grande detectado",
      detail: `Foram listados ${fileCount} arquivos. Volume alto pode indicar ausencia de modularizacao ou dependencias versionadas.`,
      recommendation:
        "Confirmar que diretorios pesados como build/, vendor/ ou caches estao no .gitignore. Considerar quebrar o projeto em modulos.",
    });
  }

  if (!snapshot.configs?.tsconfigJson && filePaths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"))) {
    findings.push({
      id: "arch-ts-without-tsconfig",
      severity: "medium",
      title: "Arquivos TypeScript sem tsconfig.json",
      detail:
        "Foram encontrados arquivos .ts/.tsx mas nenhum tsconfig.json na raiz.",
      recommendation:
        "Adicionar um tsconfig.json explicito para garantir build reproduzivel e checagem de tipos consistente.",
    });
  }

  const topLevelDirs = new Set(
    filePaths
      .filter((p) => p.includes("/"))
      .map((p) => p.split("/")[0])
      .filter((d) => !d.startsWith(".") && d !== "node_modules"),
  );
  if (topLevelDirs.size > 0 && !topLevelDirs.has("src") && !topLevelDirs.has("lib") && !topLevelDirs.has("app")) {
    findings.push({
      id: "arch-no-source-folder",
      severity: "low",
      title: "Sem pasta de codigo-fonte convencional",
      detail:
        "O projeto nao parece ter um diretorio src/, lib/ ou app/ na raiz, o que dificulta separar codigo de configuracao.",
      recommendation:
        "Adotar uma pasta dedicada para codigo-fonte ajuda navegacao, build e ferramentas de analise.",
    });
  }

  return findings;
}

/* ============================================================
 * QA Risk Agent
 * ============================================================ */

function qaFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];

  if (!snapshot.hasTests) {
    findings.push({
      id: "qa-no-tests-detected",
      severity: "medium",
      title: "Testes nao identificados no snapshot",
      detail:
        "A ausencia de sinais de testes aumenta o risco de regressao em mudancas futuras.",
      recommendation:
        "Validar no Nivel 2 quais fluxos principais precisam de cobertura primeiro.",
    });
  }

  if (!snapshot.configs?.eslintConfig) {
    findings.push({
      id: "qa-no-eslint",
      severity: "low",
      title: "ESLint nao configurado",
      detail:
        "Sem ESLint, padroes de codigo e armadilhas comuns nao sao detectados automaticamente.",
      recommendation:
        "Adicionar ESLint com regras minimas (no-unused-vars, eqeqeq) e rodar antes de cada commit.",
    });
  }

  if ((snapshot.configs?.ciWorkflows.length ?? 0) === 0) {
    findings.push({
      id: "qa-no-ci",
      severity: "medium",
      title: "Sem pipeline de CI detectado",
      detail:
        "Nao foram encontrados workflows em .github/workflows/ ou .gitlab-ci/. Mudancas podem entrar no main sem build/teste automatizado.",
      recommendation:
        "Adicionar um workflow minimo (install, lint, build, test) executado em cada push e pull request.",
    });
  }

  const pkgScripts = parsePackageScripts(snapshot.configs?.packageJson);
  if (pkgScripts && !pkgScripts.test && !pkgScripts["test:unit"]) {
    findings.push({
      id: "qa-no-test-script",
      severity: "low",
      title: "package.json sem script de testes",
      detail:
        "Nao existe script `test` definido em package.json. Isso dificulta padronizar a execucao em CI ou em outras maquinas.",
      recommendation:
        "Definir `scripts.test` em package.json apontando para o runner escolhido (vitest, jest, node --test).",
    });
  }

  return findings;
}

/* ============================================================
 * Security & Permissions Agent (filesystem-level)
 * ============================================================ */

function securityFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const files = snapshot.files ?? [];

  const SENSITIVE_PATTERNS: Array<{ test: (path: string) => boolean; reason: string }> = [
    { test: (p) => /(^|\/)\.env(\.|$)/.test(p), reason: "arquivo .env" },
    { test: (p) => p.endsWith(".pem"), reason: "chave PEM" },
    { test: (p) => p.endsWith(".key"), reason: "chave privada (.key)" },
    { test: (p) => p.endsWith(".p12") || p.endsWith(".pfx"), reason: "certificado P12/PFX" },
    { test: (p) => /serviceAccount.*\.json$/i.test(p), reason: "credenciais de service account" },
    { test: (p) => /(^|\/)id_(rsa|ed25519|dsa|ecdsa)$/.test(p), reason: "chave SSH privada" },
    { test: (p) => /(^|\/)\.pgpass$/.test(p), reason: "credenciais Postgres" },
    { test: (p) => /(^|\/)\.netrc$/.test(p), reason: "credenciais .netrc" },
  ];

  const sensitiveHits = files
    .filter((f) => f.type === "file")
    .map((f) => {
      const match = SENSITIVE_PATTERNS.find((p) => p.test(f.path));
      return match ? { path: f.path, reason: match.reason } : null;
    })
    .filter((x): x is { path: string; reason: string } => x !== null);

  if (sensitiveHits.length > 0) {
    const sample = sensitiveHits.slice(0, 5).map((h) => `${h.path} (${h.reason})`).join(", ");
    findings.push({
      id: "sec-sensitive-files",
      severity: "high",
      title: "Arquivos potencialmente sensiveis detectados",
      detail: `Foram detectados ${sensitiveHits.length} arquivo(s) sensivel(is) na arvore. Exemplos: ${sample}.`,
      recommendation:
        "Confirmar que cada um esta listado no .gitignore. Conteudo desses arquivos nao foi lido pelo Overseer.",
    });
  }

  if (files.some((f) => /^(.+\/)?backup\b/i.test(f.path) || f.path.endsWith(".bak"))) {
    findings.push({
      id: "sec-backup-files",
      severity: "low",
      title: "Arquivos de backup encontrados",
      detail:
        "Arquivos com nome 'backup' ou extensao .bak podem conter dados sensiveis copiados.",
      recommendation:
        "Mover backups para fora da arvore versionada ou adicionar regras explicitas no .gitignore.",
    });
  }

  return findings;
}

/* ============================================================
 * Cybersecurity Agent (config & supply-chain level)
 * ============================================================ */

function cybersecurityFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const configs = snapshot.configs;
  const files = snapshot.files ?? [];

  // 1) .env presente mas .gitignore nao cobre
  const hasEnvFile = files.some((f) => /(^|\/)\.env(\.|$)/.test(f.path));
  if (hasEnvFile) {
    const gi = configs?.gitignore ?? "";
    const envIgnored = /(^|\n)\s*\.env(\b|\s|$)/.test(gi) || /(^|\n)\s*\.env\.\*/m.test(gi);
    if (!envIgnored) {
      findings.push({
        id: "cyber-env-not-ignored",
        severity: "high",
        title: ".env presente sem regra clara no .gitignore",
        detail:
          "Existe um arquivo .env na arvore, mas o .gitignore nao tem uma regra explicita para .env ou .env.*.",
        recommendation:
          "Adicionar `.env` e `.env.*` ao .gitignore antes do proximo commit. Verificar historico do git para confirmar que segredos nao foram comitados antes.",
      });
    }
  }

  // 2) package.json deps com versao perigosa (*, latest, file:, http://)
  const pkg = parsePackageJson(configs?.packageJson);
  if (pkg) {
    const allDeps: Record<string, string> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };

    const wildcard: string[] = [];
    const latest: string[] = [];
    const insecureProtocol: string[] = [];

    for (const [name, version] of Object.entries(allDeps)) {
      if (version === "*" || version === "x" || version === "latest") {
        if (version === "latest") latest.push(`${name}@${version}`);
        else wildcard.push(`${name}@${version}`);
      }
      if (typeof version === "string" && version.startsWith("http://")) {
        insecureProtocol.push(`${name}@${version}`);
      }
    }

    if (wildcard.length > 0) {
      findings.push({
        id: "cyber-deps-wildcard",
        severity: "medium",
        title: "Dependencias com versao curinga (*) detectadas",
        detail: `Versoes curinga aceitam qualquer release, incluindo majors com breaking changes ou versoes maliciosas. ${wildcard.slice(0, 5).join(", ")}${wildcard.length > 5 ? ", ..." : ""}.`,
        recommendation:
          "Trocar por intervalos semanticos pinados (^x.y.z ou ~x.y.z). Em libs publicas, use versoes exatas.",
      });
    }

    if (latest.length > 0) {
      findings.push({
        id: "cyber-deps-latest",
        severity: "high",
        title: "Dependencias usando tag 'latest'",
        detail: `Resolver para 'latest' a cada install permite que um pacote comprometido entre silenciosamente. ${latest.slice(0, 5).join(", ")}${latest.length > 5 ? ", ..." : ""}.`,
        recommendation:
          "Substituir 'latest' pela versao especifica que voce testou. Manter package-lock.json comitado.",
      });
    }

    if (insecureProtocol.length > 0) {
      findings.push({
        id: "cyber-deps-insecure-protocol",
        severity: "high",
        title: "Dependencias instaladas via HTTP nao seguro",
        detail: `URLs http:// permitem MITM no install. ${insecureProtocol.join(", ")}.`,
        recommendation:
          "Substituir todas as URLs por https:// ou usar nomes de pacotes do registry oficial.",
      });
    }

    // 3) scripts com comandos potencialmente perigosos
    const scripts = pkg.scripts ?? {};
    const dangerousPatterns = [
      { pattern: /rm\s+-rf\s+\/(\s|$)/, reason: "rm -rf / no script" },
      { pattern: /curl\s+[^|]*\|\s*(sh|bash)/, reason: "curl | bash (download e execucao direta)" },
      { pattern: /wget\s+[^|]*\|\s*(sh|bash)/, reason: "wget | bash" },
      { pattern: /eval\s/, reason: "uso de eval no script" },
    ];

    const scriptHits: string[] = [];
    for (const [name, body] of Object.entries(scripts)) {
      if (typeof body !== "string") continue;
      for (const { pattern, reason } of dangerousPatterns) {
        if (pattern.test(body)) {
          scriptHits.push(`${name}: ${reason}`);
        }
      }
    }
    if (scriptHits.length > 0) {
      findings.push({
        id: "cyber-dangerous-scripts",
        severity: "high",
        title: "Scripts npm com comandos potencialmente perigosos",
        detail: scriptHits.join(" | "),
        recommendation:
          "Revisar cada script. Evitar pipes diretos de download para shell e usos de eval. Preferir binarios versionados nas devDependencies.",
      });
    }

    // 4) lockfile ausente
    if (!configs?.packageLockJson && pkg.dependencies) {
      findings.push({
        id: "cyber-no-lockfile",
        severity: "medium",
        title: "package-lock.json ausente",
        detail:
          "Sem lockfile, instalacoes em maquinas diferentes podem trazer versoes diferentes de transitivas, abrindo brecha para typosquatting e dependency confusion.",
        recommendation:
          "Versionar package-lock.json (ou pnpm-lock.yaml/yarn.lock conforme o gerenciador).",
      });
    }
  }

  // 5) firestore.rules totalmente abertas
  if (configs?.firestoreRules) {
    const rules = configs.firestoreRules;
    const openMatch = /allow\s+(read|write|read,\s*write|create|update|delete)\s*(:|;)?\s*if\s+true/i.test(rules);
    if (openMatch) {
      findings.push({
        id: "cyber-firestore-open",
        severity: "high",
        title: "firestore.rules com regra 'if true'",
        detail:
          "Foi detectada ao menos uma regra 'allow ... if true' em firestore.rules. Isso libera acesso publico ao banco.",
        recommendation:
          "Substituir por regras baseadas em request.auth e validacao de payload. Testar com o emulador Firebase.",
      });
    }
  }

  // 6) storage.rules totalmente abertas
  if (configs?.storageRules) {
    const rules = configs.storageRules;
    const openMatch = /allow\s+(read|write|read,\s*write)\s*(:|;)?\s*if\s+true/i.test(rules);
    if (openMatch) {
      findings.push({
        id: "cyber-storage-open",
        severity: "high",
        title: "storage.rules com regra 'if true'",
        detail:
          "Foi detectada regra 'allow ... if true' em storage.rules. Bucket de Storage publico.",
        recommendation:
          "Restringir por request.auth e por path. Validar contentType e size para uploads.",
      });
    }
  }

  // 7) sem .gitignore mas projeto Node
  if (configs?.packageJson && !configs.gitignore) {
    findings.push({
      id: "cyber-no-gitignore",
      severity: "medium",
      title: "Projeto Node sem .gitignore",
      detail:
        "Existe package.json mas nenhum .gitignore. Risco alto de versionar node_modules, .env, builds e logs.",
      recommendation:
        "Adicionar um .gitignore minimo cobrindo node_modules/, dist/, .env, .env.*, *.log.",
    });
  }

  // 8) padroes de chaves expostas em arquivos de configuracao publica
  const publicConfigsToScan: Array<{ name: string; content?: string }> = [
    { name: "package.json", content: configs?.packageJson },
    { name: "firebase.json", content: configs?.firebaseJson },
    { name: "tsconfig.json", content: configs?.tsconfigJson },
    { name: "eslint config", content: configs?.eslintConfig },
  ];
  const apiKeyPatterns = [
    { rx: /AKIA[0-9A-Z]{16}/, label: "AWS Access Key ID" },
    { rx: /AIza[0-9A-Za-z_\-]{20,}/, label: "Google API Key" },
    { rx: /sk-[A-Za-z0-9]{20,}/, label: "OpenAI-style secret key" },
    { rx: /ghp_[A-Za-z0-9]{20,}/, label: "GitHub PAT classico" },
    { rx: /github_pat_[A-Za-z0-9_]{20,}/, label: "GitHub fine-grained PAT" },
  ];
  const exposed: string[] = [];
  for (const cfg of publicConfigsToScan) {
    if (!cfg.content) continue;
    for (const { rx, label } of apiKeyPatterns) {
      if (rx.test(cfg.content)) {
        exposed.push(`${cfg.name}: possivel ${label}`);
      }
    }
  }
  if (exposed.length > 0) {
    findings.push({
      id: "cyber-key-in-config",
      severity: "high",
      title: "Possivel chave/token em config publica",
      detail: exposed.join(" | "),
      recommendation:
        "Mover qualquer chave detectada para variavel de ambiente. Rotacionar a chave imediatamente caso ja tenha sido comitada.",
    });
  }

  // 9) sem .gitignore protegendo node_modules em projeto Node
  if (configs?.packageJson && configs.gitignore) {
    const gi = configs.gitignore;
    const nmIgnored = /(^|\n)\s*node_modules\/?(\s|$)/.test(gi);
    if (!nmIgnored) {
      findings.push({
        id: "cyber-node-modules-not-ignored",
        severity: "medium",
        title: "node_modules nao consta no .gitignore",
        detail:
          "Sem essa regra, node_modules pode ser versionado em commits acidentais, inflando o repo e expondo arvore de deps.",
        recommendation:
          "Adicionar a linha `node_modules/` no .gitignore.",
      });
    }
  }

  return findings;
}

/* ============================================================
 * Firebase / DevOps Agent
 * ============================================================ */

function firebaseDevopsFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const files = snapshot.files ?? [];
  const configs = snapshot.configs;

  const hasFirebaseConfig = files.some((file) =>
    ["firebase.json", ".firebaserc"].includes(file.path),
  );

  if (!hasFirebaseConfig) {
    findings.push({
      id: "devops-no-firebase-config",
      severity: "low",
      title: "Configuracao Firebase nao identificada",
      detail:
        "O snapshot nao encontrou firebase.json ou .firebaserc, entao a analise Firebase fica limitada.",
      recommendation:
        "Tratar achados Firebase como preliminares ate confirmar a stack real do projeto.",
    });
    return findings;
  }

  // firebase.json sem firestore/storage rules apontados
  if (configs?.firebaseJson) {
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(configs.firebaseJson) as Record<string, unknown>;
    } catch {
      findings.push({
        id: "devops-firebase-json-invalid",
        severity: "medium",
        title: "firebase.json com JSON invalido",
        detail: "Nao foi possivel fazer parse do firebase.json. Deploys podem falhar.",
        recommendation: "Validar o arquivo com `firebase --debug` ou um linter de JSON.",
      });
    }
    if (parsed) {
      if (parsed.firestore && !configs.firestoreRules) {
        findings.push({
          id: "devops-firestore-rules-missing",
          severity: "high",
          title: "firebase.json menciona Firestore mas firestore.rules nao foi encontrado",
          detail:
            "Sem o arquivo de regras, o deploy pode publicar regras default abertas ou substituir regras existentes.",
          recommendation:
            "Garantir firestore.rules versionado e referenciado em firebase.json.",
        });
      }
      if (parsed.storage && !configs.storageRules) {
        findings.push({
          id: "devops-storage-rules-missing",
          severity: "high",
          title: "firebase.json menciona Storage mas storage.rules nao foi encontrado",
          detail:
            "Risco de bucket publico apos deploy.",
          recommendation:
            "Adicionar storage.rules versionado e referenciado em firebase.json.",
        });
      }
    }
  }

  // CI sem job que rode firebase deploy mais de uma vez? Heuristica simples:
  // se ha CI mas nenhum workflow menciona 'firebase', sugerir
  const ciWorkflows = configs?.ciWorkflows ?? [];
  if (hasFirebaseConfig && ciWorkflows.length > 0) {
    // Esta heuristica nao le o YAML para evitar falsos positivos ruidosos.
    // Apenas registra info.
    findings.push({
      id: "devops-ci-with-firebase",
      severity: "info",
      title: "Projeto Firebase com pipeline de CI presente",
      detail:
        "Ha workflows de CI e configuracao Firebase. Validar manualmente se deploy esta protegido por aprovacao e secrets.",
      recommendation:
        "Confirmar que tokens/credenciais Firebase nos workflows usam secrets do repositorio, nunca variaveis em texto.",
    });
  }

  return findings;
}

/* ============================================================
 * Product & UX Agent
 * ============================================================ */

function productFindings(snapshot: ProjectSnapshot): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const files = snapshot.files ?? [];

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

  const hasLicense = files.some((f) => /^license(\.|$)/i.test(f.path));
  if (!hasLicense) {
    findings.push({
      id: "product-missing-license",
      severity: "low",
      title: "Arquivo LICENSE ausente",
      detail:
        "Sem LICENSE, terceiros nao tem clareza sobre o que podem ou nao fazer com o codigo. Por padrao, copyright total.",
      recommendation:
        "Adicionar uma licenca explicita (MIT, Apache 2.0, etc.) compativel com a sua intencao.",
    });
  }

  const hasChangelog = files.some((f) => /^changelog(\.|$)/i.test(f.path));
  if (!hasChangelog && snapshot.configs?.packageJson) {
    findings.push({
      id: "product-missing-changelog",
      severity: "info",
      title: "CHANGELOG nao identificado",
      detail:
        "Projetos Node sem CHANGELOG perdem rastreabilidade entre versoes para usuarios e contribuidores.",
      recommendation:
        "Manter um CHANGELOG.md mesmo manualmente, ou usar Conventional Commits + changeset.",
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

/* ============================================================
 * Helpers
 * ============================================================ */

function parsePackageJson(raw?: string): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
} | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parsePackageScripts(raw?: string): Record<string, string> | undefined {
  const pkg = parsePackageJson(raw);
  return pkg?.scripts;
}
