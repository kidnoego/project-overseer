import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type CheckupRequest = {
  project?: string;
  signals?: string[];
};

type CheckupResponse = {
  project: string;
  score: number;
  risks: string[];
  recommendations: string[];
  generatedAt: string;
};

const port = Number(process.env.PORT ?? 3333);

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, service: "overseer-sample-project" });
    return;
  }

  if (request.method === "POST" && request.url === "/checkup") {
    const payload = await readJson(request);
    sendJson(response, 200, buildCheckup(payload));
    return;
  }

  sendJson(response, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`sample project listening on http://localhost:${port}`);
});

function buildCheckup(payload: CheckupRequest): CheckupResponse {
  const signals = new Set(payload.signals ?? []);
  const score = ["tests", "readme", "ci", "typed"].reduce(
    (total, signal) => total + (signals.has(signal) ? 25 : 0),
    0
  );

  return {
    project: payload.project?.trim() || "unknown-project",
    score,
    risks: score >= 75 ? ["Sem risco alto no exemplo atual."] : ["Cobertura de qualidade incompleta."],
    recommendations:
      score >= 75
        ? ["Manter checks automatizados antes de cada release."]
        : ["Adicionar testes, README operacional, CI e tipagem estrita."],
    generatedAt: new Date().toISOString()
  };
}

async function readJson(request: IncomingMessage): Promise<CheckupRequest> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as CheckupRequest;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}
