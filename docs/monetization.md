# Monetizacao

Este documento descreve o posicionamento freemium do produto. Ele nao define
nem autoriza implementacao de SaaS, dashboard, checkout, cobranca, assinatura
ou controle real de licenca nesta primeira versao.

## Modelo inicial

- Nivel 1: gratuito.
- Nivel 2: gratuito, liberado somente apos confirmacao explicita do usuario.
- Nivel 3: futuro, pago e bloqueado nesta primeira versao.

## Experiencia por nivel

### Nivel 1 gratuito

Objetivo: gerar clareza rapida sem executar mudancas.

- Analisa o contexto disponivel.
- Aponta riscos, oportunidades e proximos passos.
- Nao cria tarefas formais nem aplica alteracoes.
- Deve ser suficiente para o usuario entender o problema e decidir se quer
  avancar.

### Nivel 2 gratuito com confirmacao

Objetivo: aprofundar a analise ou preparar trabalho com permissao clara do
usuario.

- So deve iniciar depois de confirmacao explicita.
- Pode organizar recomendacoes e detalhar plano de acao.
- Continua gratuito nesta versao.
- Nao deve ser apresentado como assinatura, teste gratis ou etapa de pagamento.

### Nivel 3 futuro pago e bloqueado

Objetivo futuro: concentrar capacidades de execucao assistida.

- Deve permanecer bloqueado na primeira versao.
- Nao deve iniciar fluxo de compra, captura de pagamento ou criacao de conta.
- Quando solicitado, deve responder apenas com a mensagem de bloqueio definida
  em `docs/levels.md`.

## Estrategia freemium

- O valor gratuito esta na clareza do diagnostico e na reducao de incerteza.
- A progressao do Nivel 1 para o Nivel 2 deve depender de confirmacao, nao de
  friccao comercial.
- O valor pago futuro deve estar associado a execucao assistida, aplicacao de
  correcoes e validacao, sempre com autorizacao do usuario.
- A comunicacao deve evitar promessas de produto SaaS enquanto essas partes nao
  existirem.

## Nivel 3 futuro

O Nivel 3 podera incluir:

- criacao de arquivos;
- criacao de branches;
- sugestoes de alteracao;
- execucao assistida;
- aplicacao de correcoes com autorizacao;
- fluxos de validacao e teste;
- integracao com planos pagos ou licencas.

## Restricao da primeira versao

Nao implementar pagamento real, checkout, dashboard de assinatura, billing,
trial, paywall funcional, criacao de conta paga, integracao com provedor de
pagamento ou controle de licenca.

Quando o usuario solicitar Nivel 3, responder apenas com a mensagem de bloqueio pago definida em `docs/levels.md`.
