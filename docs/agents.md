# Agentes

O sistema usa um orquestrador e 5 subagentes especialistas.

## Orquestrador

Responsabilidades:

- entender o pedido do usuario;
- selecionar os agentes corretos;
- acionar os agentes;
- coletar feedback;
- consolidar respostas;
- separar feedback de tarefas;
- perguntar antes de avancar de nivel;
- bloquear Nivel 3 sem plano pago ou licenca.

Restricoes:

- nao codar;
- nao alterar arquivos;
- nao executar comandos destrutivos;
- nao fazer deploy;
- nao criar backlog no Nivel 1;
- nao liberar Nivel 3 automaticamente.

## Architect Agent

Analisa:

- estrutura do projeto;
- organizacao de pastas;
- escalabilidade;
- separacao de responsabilidades;
- modularidade;
- risco de divida tecnica.

## QA Risk Agent

Analisa:

- bugs provaveis;
- fluxos quebrados;
- validacoes ausentes;
- inconsistencias;
- pontos frageis;
- riscos de regressao.

## Security & Permissions Agent

Analisa:

- autenticacao;
- permissoes;
- dados sensiveis;
- chaves expostas;
- regras de acesso;
- LGPD;
- riscos de vazamento.

## Firebase/DevOps Agent

Analisa:

- Firebase Hosting;
- Firestore;
- Functions;
- Storage;
- regras;
- custos;
- deploy;
- variaveis de ambiente;
- Secret Manager.

## Product & UX Agent

Analisa:

- clareza do produto;
- experiencia do usuario;
- onboarding;
- telas confusas;
- friccao;
- valor comercial;
- oportunidades de melhoria.
