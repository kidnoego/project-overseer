# Visao do Produto

O Project Overseer e um sistema de checkup tecnico para projetos de software executado no ambiente local da IDE ou ferramenta de IA do usuario.

Ele atua como uma camada de orquestracao entre o usuario e agentes especialistas. O orquestrador coleta o objetivo, distribui a analise, consolida os achados e devolve uma resposta final. Ele nao implementa codigo, nao altera o projeto analisado e nao substitui o julgamento do usuario.

O objetivo principal e transformar leituras tecnicas paralelas em diagnosticos claros, acionaveis e seguros, com limites de permissao definidos por nivel.

## Publico-alvo

- Desenvolvedores que querem uma segunda opiniao tecnica sobre um projeto.
- Fundadores ou equipes pequenas que precisam entender riscos antes de investir em melhorias.
- Times usando IDEs com agentes de IA que querem organizar feedback de agentes em um fluxo controlado.

## Principios do produto

- O orquestrador coordena, mas nao coda.
- Agentes especialistas analisam dominios especificos e retornam handoffs estruturados.
- O resultado final deve separar fatos observados, riscos, recomendacoes e proximos passos.
- Mudancas no projeto analisado so entram em escopo quando um nivel futuro permitir execucao explicita.
- A CLI deve ser modular para permitir novos agentes, novos niveis e novos formatos de saida sem reescrever o fluxo central.

## Niveis

### Nivel 1: Checkup tecnico

O usuario recebe um relatorio tecnico consolidado com pontos positivos, riscos, inconsistencias e recomendacoes gerais.

Este nivel e somente diagnostico. Ele nao cria arquivos, nao corrige codigo e nao executa refatoracoes.

### Nivel 2: Planejamento priorizado

O usuario recebe uma lista priorizada de tarefas baseada no relatorio do Nivel 1.

Este nivel organiza o trabalho recomendado, mas ainda nao deve executar alteracoes no projeto.

### Nivel 3: Execucao assistida

Este nivel podera auxiliar na execucao pratica em uma versao futura.

Na primeira versao, o Nivel 3 deve permanecer documentado como pago e bloqueado.

## Arquitetura esperada da CLI

A CLI deve ser organizada em modulos pequenos e previsiveis:

- Entrada: interpreta argumentos, nivel solicitado e caminho do projeto.
- Orquestracao: define quais agentes participam e agrega handoffs.
- Agentes: contem instrucoes e contratos de analise por especialidade.
- Relatorios: formata a saida consolidada para o usuario.
- Politicas: valida permissoes, escopo de nivel e acoes bloqueadas.

Essa separacao evita que regras de produto, prompts de agentes e formatacao de relatorio fiquem acoplados em um unico ponto.

## Roadmap de Distribuicao

O Project Overseer devera suportar 3 formas oficiais de instalacao e distribuicao.

### 1. Git Clone

Fluxo esperado:

```bash
git clone <url-do-repositorio>
cd project-overseer
npm install
npm run build
npm start
```

### 2. Download direto ZIP

Fluxo esperado:

```bash
baixar ZIP do GitHub
extrair o ZIP
cd project-overseer
npm install
npm run build
npm start
```

### 3. npm / npx

Fluxo esperado:

```bash
npm install -g project-overseer
```

ou:

```bash
npx project-overseer
```

O pacote npm devera expor o comando principal `ovr`.

## Modelo local da primeira fase

O projeto roda localmente na maquina do usuario. Nesta primeira fase:

- nao existe SaaS;
- nao existe backend central;
- nao existe coleta remota de codigo;
- nao existe envio remoto de relatorios;
- relatorios ficam locais dentro de `.overseer/`;
- Nivel 1 e Nivel 2 sao gratuitos;
- Nivel 3 sera pago e permanece bloqueado.

## Fora do escopo da primeira versao

- SaaS.
- Dashboard.
- Pagamento real.
- Deploy.
- Criacao automatica de arquivos no projeto analisado.
- Correcao automatica de codigo.
- Reestruturacao automatica de pastas.
- Execucao de comandos destrutivos ou migracoes.

## Estrategia de validacao da primeira fase

A primeira fase do produto e de validacao privada via dogfood. O autor utiliza
a CLI nos proprios projetos pessoais antes de qualquer divulgacao ampla. O
GitHub fica publico mas em modo passivo: sem promocao ativa, sem campanhas de
descoberta, sem publicacao no npm.

### Por que dogfood primeiro

- Cada projeto real do autor vira um caso de teste diferente.
- Falhas, falsos positivos e findings fracos aparecem cedo, em contexto real.
- O autor articula o problema antes de empurrar a solucao para outras pessoas.
- Reduz o risco de evoluir a ferramenta com base em suposicoes.

### Praticas recomendadas durante a validacao

- Linkar `ovr` globalmente com `npm link` na maquina do autor.
- Rodar `ovr init`, `ovr checkup completo` e `ovr nivel2` em ciclos curtos
  (por exemplo, ao fim de cada sprint ou semana de trabalho) nos projetos
  ativos.
- Abrir issues no repositorio com a label `dogfood-finding` sempre que o
  relatorio decepcionar, mesmo que o autor seja o unico usuario.
- Tagear versoes (`vX.Y.Z`) antes de refatorar agentes ou heuristicas, para
  sempre haver um ponto de retorno estavel.
- Manter o repositorio publico, sem promover, ate a ferramenta gerar findings
  consistentes.

### Limitacoes conhecidas para iteracoes futuras

Sao as proximas frentes naturais de evolucao, identificadas durante o dogfood
inicial. Servem como guia de prioridades quando o projeto voltar para uma
fase ativa de desenvolvimento.

- Expandir as heuristicas dos agentes em `src/core/agent-router.ts`. As regras
  atuais sao genericas. A evolucao natural e adicionar regras especificas por
  contexto: validar `firestore.rules`, configuracoes do Firebase, dependencias
  desatualizadas, scripts perigosos em `package.json`, presenca de ESLint,
  ausencia de hooks de pre-commit, etc.
- Tornar configuravel o limite de 500 entradas em `src/core/project-scanner.ts`.
  Projetos medios sao truncados cedo. A flag pode ser uma variavel de ambiente
  ou um argumento da CLI.
- Reescrever o parser do Nivel 2 em `src/commands/nivel2.ts`. Hoje ele extrai
  bullets do Markdown gerado. O caminho mais robusto e consumir diretamente o
  JSON estruturado da secao "Dados adicionais" do relatorio.
- Quando os tres pontos acima estiverem maduros, considerar publicacao no npm
  e divulgacao ativa em comunidades de desenvolvedores.
