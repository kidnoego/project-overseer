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
ovr checkup firebase
ovr checkup produto
ovr nivel2
ovr nivel3
```

- `init`: cria a estrutura local usada pelo Overseer.
- `checkup`: executa o Nivel 1. Sem escopo informado, usa `completo`.
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
- Security & Permissions Agent: seguranca, permissoes e limites entre niveis.
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

Curto prazo:

- Refinar mensagens do CLI e exemplos de uso.
- Expandir relatorios locais de Nivel 1.
- Melhorar validacoes antes do Nivel 2.
- Padronizar handoffs entre agentes.

Medio prazo:

- Fortalecer testes automatizados da CLI.
- Melhorar diagnosticos de ambiente local.
- Adicionar mais exemplos de relatorios.
- Evoluir a configuracao local do `.overseer/`.

Futuro Nivel 3:

- Manter confirmacao explicita do usuario antes de qualquer execucao.
- Sugerir alteracoes controladas.
- Criar arquivos somente com autorizacao.
- Executar validacoes e testes quando permitido.
- Integrar licencas ou planos pagos apenas quando existir infraestrutura real.

Enquanto essa infraestrutura nao existir, `ovr nivel3` deve continuar bloqueado
e retornar apenas uma mensagem informativa.