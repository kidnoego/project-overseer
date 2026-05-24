# Overseer Sample Project

Projeto TypeScript minimo usado para demonstrar os relatorios de QA do Project Overseer.

## O que existe

- Servidor HTTP sem framework externo.
- Endpoint `GET /health` para verificacao de vida.
- Endpoint `POST /checkup` que calcula um score simples a partir de sinais enviados no corpo da requisicao.

## Como rodar

```bash
npm install
npm run check
npm run build
npm start
```

## Exemplo de requisicao

```bash
curl -X POST http://localhost:3333/checkup \
  -H "content-type: application/json" \
  -d "{\"project\":\"demo\",\"signals\":[\"tests\",\"readme\",\"ci\"]}"
```

## Pontos esperados no relatorio

- Resumo objetivo do estado do projeto.
- Riscos de validacao, testes e observabilidade.
- Recomendacoes praticas para a proxima iteracao.
- Timestamp da geracao e agente responsavel.