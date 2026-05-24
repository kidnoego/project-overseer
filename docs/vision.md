# Visao do Produto

O Overclock Project Overseer e um sistema de checkup tecnico para projetos de software executado dentro do ambiente Overclock/ADE.

Ele atua como uma camada de orquestracao entre o usuario e agentes especialistas. O orquestrador coleta o objetivo, distribui a analise, consolida os achados e devolve uma resposta final. Ele nao implementa codigo, nao altera o projeto analisado e nao substitui o julgamento do usuario.

O objetivo principal e transformar leituras tecnicas paralelas em diagnosticos claros, acionaveis e seguros, com limites de permissao definidos por nivel.

## Publico-alvo

- Desenvolvedores que querem uma segunda opiniao tecnica sobre um projeto.
- Fundadores ou equipes pequenas que precisam entender riscos antes de investir em melhorias.
- Times usando Overclock/ADE que querem organizar feedback de agentes em um fluxo controlado.

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
