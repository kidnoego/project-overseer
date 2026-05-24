# Comandos

Este documento descreve a interface esperada de comandos do Overclock Project Overseer. Ele e documental: nao implementa CLI, nao executa agentes diretamente e nao altera recursos externos.

## Estrutura geral

Formato esperado:

```text
ovr <comando>
ovr checkup <escopo>
ovr nivel2
ovr nivel3
```

Regras gerais:

- Os comandos de Nivel 1 executam analise e retornam relatorio.
- O Nivel 1 nao cria tarefas formais.
- O Nivel 2 depende de um relatorio de Nivel 1 ja concluido.
- O Nivel 3 deve permanecer bloqueado ate existir plano pago ou licenca ativa.
- Comandos documentados aqui nao devem ser tratados como implementacao pronta.
- A CLI roda localmente na maquina do usuario e grava relatorios apenas dentro de `.overseer/`.

## `ovr checkup completo`

Executa o Nivel 1 com todos os agentes.

Agentes acionados:

- Architect Agent
- QA Risk Agent
- Security & Permissions Agent
- Firebase/DevOps Agent
- Product & UX Agent

## `ovr checkup arquitetura`

Executa somente o Architect Agent.

## `ovr checkup qa`

Executa somente o QA Risk Agent.

## `ovr checkup seguranca`

Executa somente o Security & Permissions Agent.

## `ovr checkup firebase`

Executa somente o Firebase/DevOps Agent.

Escopo esperado:

- Firebase Hosting, Firestore, Functions e Storage.
- Regras de seguranca, indices e custos potenciais.
- Variaveis de ambiente, secrets e separacao entre ambientes.
- Comandos Firebase documentados, sem execucao real.
- Riscos de sandbox, rede, credenciais e permissoes.

## `ovr checkup produto`

Executa somente o Product & UX Agent.

## `ovr nivel2`

So pode rodar depois de um Nivel 1 concluido.

Transforma o relatorio anterior em tarefas priorizadas.

## `ovr nivel3`

Retorna aviso de bloqueio:

> Nivel 3 indisponivel nesta versao. Nao ha checkout, SaaS, backend ou coleta remota nesta versao local.

## Comandos locais documentaveis

Os comandos abaixo podem aparecer em relatorios ou guias operacionais, mas nao devem ser executados automaticamente pelo Firebase/DevOps Agent.

### Firebase CLI

```bash
firebase --version
firebase login
firebase use
firebase emulators:start
firebase emulators:exec "<comando-de-teste>"
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

Notas:

- `firebase --version` e apenas diagnostico local.
- `firebase login` e interativo e pode exigir navegador; evitar em sandbox.
- `firebase use` pode depender de projeto configurado em `.firebaserc`.
- `firebase emulators:start` pode abrir portas locais e consumir processos longos.
- `firebase emulators:exec` e preferivel para validacoes automatizadas com inicio e fim claros.
- Qualquer `firebase deploy` altera recursos remotos e so deve existir como documentacao ate o Nivel 3 autorizado.

### Validacao local

```bash
npm install
npm run build
npm test
npm run lint
```

Notas:

- Estes comandos dependem do gerenciador de pacotes e scripts reais do projeto.
- Se o sandbox bloquear rede ou escrita, registrar o bloqueio e continuar com analise documental.
- Nao assumir que um comando existe sem conferir o arquivo de configuracao do projeto.

## Roadmap de Distribuicao

O Overclock Project Overseer devera suportar 3 formas oficiais de instalacao e distribuicao.

### 1. Git Clone

Fluxo esperado:

```bash
git clone <url-do-repositorio>
cd overclock-project-overseer
npm install
npm run build
npm start
```

### 2. Download direto ZIP

Fluxo esperado:

```bash
baixar ZIP do GitHub
extrair o ZIP
cd overclock-project-overseer
npm install
npm run build
npm start
```

### 3. npm / npx

Fluxo esperado:

```bash
npm install -g overclock-project-overseer
```

ou:

```bash
npx overclock-project-overseer
```

O pacote npm devera expor o comando principal `ovr`.

## Garantias da primeira fase

- O projeto roda localmente na maquina do usuario.
- Nao existe SaaS.
- Nao existe backend central.
- Nao existe coleta remota de codigo.
- Relatorios ficam locais dentro de `.overseer/`.
- Nivel 1 e Nivel 2 sao gratuitos.
- Nivel 3 sera pago e permanece bloqueado.

## Funcionamento local e sandbox

Ao documentar ou revisar comandos, separar tres categorias:

- Seguro para analise: leitura de arquivos, listagem de scripts e verificacao de versao.
- Requer ambiente local: build, lint, testes e emuladores.
- Requer autorizacao externa: login, deploy, criacao de projeto, secrets e alteracoes remotas.

Em caso de erro de sandbox, MCP, credenciais, rede ou binario ausente:

- Registrar o erro no handoff do agente.
- Informar qual validacao ficou pendente.
- Continuar a revisao com os arquivos disponiveis.
- Nao substituir a validacao real por suposicao de sucesso.