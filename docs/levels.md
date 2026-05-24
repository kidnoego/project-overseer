# Niveis do Sistema

## Nivel 1 - Gratuito / Padrao

Modo: somente leitura + feedback.

O sistema deve:

- analisar o projeto;
- identificar riscos;
- apontar problemas;
- sugerir melhorias gerais;
- gerar relatorio final.

Proibido no Nivel 1:

- alterar arquivos;
- criar arquivos;
- executar mudancas;
- criar tarefas formais de backlog;
- mexer em codigo;
- acionar funcionalidades do Nivel 2 ou Nivel 3 sem confirmacao do usuario.

Fluxo:

1. O orquestrador le a estrutura do projeto.
2. O orquestrador aciona os agentes necessarios.
3. Cada agente analisa sua area.
4. O orquestrador consolida tudo em um relatorio simples.
5. O orquestrador pergunta se o usuario deseja avancar para o Nivel 2.

Pergunta final obrigatoria:

> Deseja avancar para o Nivel 2 e transformar isso em tarefas priorizadas?

## Nivel 2 - Gratuito / Apos Confirmacao

Modo: sugestao de tarefas.

O sistema deve:

- transformar os achados do Nivel 1 em tarefas;
- criar checklist;
- separar por prioridade;
- indicar ordem de execucao;
- indicar qual agente recomendou cada tarefa;
- sugerir proximos passos.

Proibido no Nivel 2:

- alterar codigo;
- criar branch;
- executar correcao;
- fazer deploy;
- modificar arquivos sem autorizacao explicita;
- acionar funcionalidades do Nivel 3;
- tratar pedido de execucao assistida como liberado.

Limite de permissao:

- O Nivel 2 organiza e prioriza trabalho, mas nao executa mudancas praticas.
- Qualquer pedido para criar arquivos, aplicar patches, abrir branches, rodar
  correcoes ou fazer deploy deve ser tratado como Nivel 3.

## Nivel 3 - Pago / Bloqueado

Modo futuro: execucao assistida.

O Nivel 3 e pago e fica bloqueado nesta versao. Ele nao deve ser liberado
automaticamente, mesmo que o usuario peca execucao pratica.

Resposta obrigatoria quando o usuario pedir Nivel 3:

> Para usar o Nivel 3, e necessario ativar um plano pago ou licenca. O Nivel 3 permite acoes praticas como criacao de arquivos, branches, sugestoes de alteracao e execucao assistida.

Na primeira versao, o Nivel 3 fica apenas documentado, sem implementacao ativa.

Bloqueios obrigatorios no Nivel 3 nesta versao:

- nao criar, alterar ou apagar arquivos;
- nao aplicar patches;
- nao criar branches ou commits;
- nao executar correcoes automatizadas;
- nao fazer deploy;
- nao acessar, alterar ou rotacionar segredos;
- nao contornar bloqueios de pagamento, licenca ou permissao.

Separacao entre niveis:

- Nivel 1: analisa e relata.
- Nivel 2: transforma achados em tarefas e prioridades.
- Nivel 3: executaria acoes assistidas, mas esta pago e bloqueado nesta
  versao.
