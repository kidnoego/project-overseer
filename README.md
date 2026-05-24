# Project Overseer

CLI local em Node.js + TypeScript para fazer checkups tecnicos de projetos. O
comando publico da ferramenta e `ovr`.

O Overseer analisa um projeto local, organiza feedback por especialidade e gera
relatorios dentro de `.overseer/`. Nesta versao ele nao altera codigo, nao envia
arquivos para SaaS, nao depende de backend central e nao coleta dados remotos.

## Quick Start

Requisitos:

- Node.js 20 ou superior.
- npm disponivel no terminal.
- Um projeto local para analisar.

Instale as dependencias e gere o build:

```bash
npm install
npm run build
```

Execute durante desenvolvimento:

```bash
npm run dev -- help
npm run dev -- init
npm run dev -- checkup completo
```

Depois de linkar localmente, use o binario `ovr`:

```bash
npm link
ovr help
ovr init
ovr checkup completo
```

Quando o pacote estiver publicado, o uso esperado sera:

```bash
npx project-overseer checkup completo
```

## Comandos

```bash
ovr help
ovr init
ovr checkup
ovr checkup completo
ovr checkup arquitetura
ovr checkup qa
ovr checkup seguranca
ovr checkup cybersec
ovr checkup firebase
ovr checkup produto
ovr nivel2
ovr nivel3
```

- `init`: cria a estrutura local usada pelo Overseer.
- `checkup`: executa o Nivel 1. Sem escopo informado, usa `completo`.
- `checkup cybersec`: roda apenas o Cybersecurity Agent (configs, deps, regras
  Firebase, secrets versionaveis).
- `nivel2`: organiza prioridades a partir do relatorio de Nivel 1.
- `nivel3`: permanece bloqueado nesta primeira versao.

As mensagens da CLI seguem o formato `[OK]`, `[ERRO]` ou `[INFO]`, com detalhes
em linhas curtas. Erros sao exibidos sem stack trace para manter a saida legivel.

## Como funciona

O fluxo atual e propositalmente local e conservador:

1. O usuario executa `ovr init` para preparar `.overseer/`.
2. O usuario executa `ovr checkup <escopo>`.
3. O orquestrador seleciona os agentes especialistas conforme o escopo.
4. Os agentes produzem feedback tecnico dentro dos seus limites.
5. O resultado e consolidado em um relatorio local.
6. O usuario pode executar `ovr nivel2` para transformar o diagnostico em uma
   lista priorizada.

O Nivel 1 e somente leitura: ele produz feedback tecnico e nao cria tarefas
formais. O Nivel 2 organiza prioridades, mas ainda nao aplica mudancas. O Nivel
3 e reservado para uma futura camada de execucao assistida e continua bloqueado.

## Arquitetura

A CLI deve permanecer modular e facil de auditar:

- `src/index.ts`: entrada da CLI, parsing de comandos, mensagens e tratamento de
  erros.
- `src/commands/`: implementacoes dos comandos publicos.
- `src/core/`: scanner, orquestracao e escrita de relatorios.
- `agents/`: definicoes do orquestrador e dos subagentes especialistas.
- `docs/`: visao, niveis, comandos, agentes e politica de monetizacao.
- `prompts/`: prompts base para execucao no ambiente local da IDE/IA do usuario.
- `examples/`: exemplos de saida dos niveis.
- `.overseer/`: saidas locais geradas na maquina do usuario.

Responsabilidades do orquestrador:

- entender o pedido do usuario;
- distribuir o trabalho entre agentes especialistas;
- evitar overlap entre responsabilidades;
- coletar handoffs;
- consolidar respostas;
- validar consistencia;
- organizar prioridades quando o Nivel 2 for solicitado;
- manter bloqueado o que ainda nao pertence ao nivel atual.

Subagentes previstos:

- Architect Agent: arquitetura, modularidade e estrutura do projeto.
- QA Risk Agent: riscos de bugs, regressao e qualidade.
- Security & Permissions Agent: arquivos sensiveis na arvore (filesystem-level).
- Cybersecurity Agent: vulnerabilidades de configuracao e supply chain
  (config-level): secrets versionaveis, deps inseguras, regras Firebase
  abertas, scripts perigosos, chaves expostas em configs publicas.
- Firebase/DevOps Agent: Firebase, comandos, sandbox e riscos operacionais.
- Product & UX Agent: experiencia do usuario, fluxo de niveis e clareza da CLI.

## Limites locais

Esta versao nao implementa:

- SaaS ou dashboard web.
- Backend central obrigatorio.
- API remota obrigatoria.
- Coleta remota de codigo, relatorios ou metadados.
- Pagamento real, checkout, billing, trial, assinatura ou licenca.
- Conta de usuario.
- Deploy automatizado.
- Criacao automatica de branches.
- Alteracoes automaticas de codigo.
- Execucao assistida de Nivel 3.

Quando ocorrer erro de sandbox, MCP, rede, credenciais ou binario ausente, o
sistema deve registrar o problema, indicar a validacao pendente e continuar com
a analise documental disponivel.

## Roadmap

### Estrategia de validacao (dogfood)

A primeira fase do projeto e dogfood pessoal. O autor usa a propria CLI nos
seus projetos antes de qualquer divulgacao publica. Isso evita evoluir a
ferramenta no escuro e garante que cada melhoria responde a um caso real.

Praticas recomendadas durante essa fase:

- Manter `ovr` linkado globalmente com `npm link` para facilitar uso diario em
  qualquer projeto.
- Rodar `ovr init`, `ovr checkup completo` e `ovr nivel2` em ciclos curtos
  (por exemplo a cada fim de sprint) nos projetos ativos.
- Registrar cada falha ou achado fraco como issue no proprio repositorio com a
  label `dogfood-finding`, mesmo sendo o unico usuario, para criar backlog
  rastreavel.
- Criar tags `vX.Y.Z` antes de refatorar agentes ou heuristicas, para sempre
  haver um ponto de retorno estavel.
- Manter o repositorio publico mas sem promocao ativa enquanto a ferramenta
  ainda nao gera findings consistentes em projetos reais.

### Limitacoes conhecidas a evoluir

Pontos identificados durante o dogfood inicial e que servem como entrada para
as proximas iteracoes:

- Heuristicas dos agentes em `src/core/agent-router.ts` sao genericas e
  produzem poucos findings em projetos reais. Devem ser expandidas com regras
  especificas (firestore.rules, configs Firebase, dependencias desatualizadas,
  scripts perigosos no `package.json`, etc.).
- Limite atual de 500 entradas no `project-scanner.ts` trunca projetos medios.
  Tornar configuravel via flag ou ajustar dinamicamente conforme a estrutura
  do projeto.
- O parser do Nivel 2 (`src/commands/nivel2.ts`) le o Markdown do relatorio
  por bullets. Migrar para consumir diretamente o JSON estruturado da secao
  "Dados adicionais" tornaria o Nivel 2 mais robusto.

### Curto prazo

- Refinar mensagens do CLI e exemplos de uso.
- Expandir relatorios locais de Nivel 1.
- Melhorar validacoes antes do Nivel 2.
- Padronizar handoffs entre agentes.

### Experiencia do usuario na CLI

A saida atual e funcional, mas minimalista. As proximas iteracoes devem
melhorar a experiencia de uso direto no terminal:

- Logging por agente durante o `checkup completo`, mostrando em tempo real
  quem esta rodando e quantos findings cada agente produziu (ex.:
  `[..] Cybersecurity Agent... 2 finding(s)`).
- Resumo executivo no terminal apos a execucao, com contagem por severidade
  e o caminho do relatorio destacado, sem o usuario precisar abrir o
  Markdown para entender o resultado.
- Cores, icones e indentacao consistentes para `[OK]`, `[ERRO]`, `[INFO]`
  e severidades (high, medium, low, info), respeitando `NO_COLOR` quando
  definido.
- Flag `--quiet` para integracao em scripts e flag `--verbose` para debug
  com detalhes do scanner e dos agentes.
- Modo `--json` que imprime o resultado estruturado direto no stdout,
  permitindo encadear com outras ferramentas.
- Spinner ou barra simples de progresso durante a varredura, especialmente
  em projetos grandes onde o limite de 1000 entradas pode demorar.
- Mensagem de "next step" mais explicita ao final de cada comando, ja
  apontando o proximo verbo (`Proximo: ovr nivel2` ou
  `Proximo: revise o relatorio em ...`).
- `ovr help <comando>` por subcomando, no estilo `ovr help checkup`,
  listando os escopos validos com uma linha de descricao para cada.
- Mensagens de erro com sugestao de correcao automatica quando aplicavel
  (ex.: detectar typo em escopo e sugerir o valido mais proximo).
- Internacionalizacao do texto da CLI no futuro (`OVR_LANG=en`), mantendo
  PT-BR como padrao.

### Medio prazo

- Fortalecer testes automatizados da CLI.
- Melhorar diagnosticos de ambiente local.
- Adicionar mais exemplos de relatorios.
- Evoluir a configuracao local do `.overseer/`.

### Futuro Nivel 3

- Manter confirmacao explicita do usuario antes de qualquer execucao.
- Sugerir alteracoes controladas.
- Criar arquivos somente com autorizacao.
- Executar validacoes e testes quando permitido.
- Integrar licencas ou planos pagos apenas quando existir infraestrutura real.

Enquanto essa infraestrutura nao existir, `ovr nivel3` deve continuar bloqueado
e retornar apenas uma mensagem informativa.