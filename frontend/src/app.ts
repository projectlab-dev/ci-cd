import { createServer as createHttpServer, IncomingMessage, Server, ServerResponse } from "node:http";

const serviceName = "frontend";
const pageTitle = "Frontend Service";
const pageDescription = "Frontend placeholder used to validate image build, stack deploy and healthcheck.";
const runtimeMetadata = {
  environment: process.env.NODE_ENV ?? "development",
  version: process.env.APP_VERSION ?? "local",
};

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  try {
    const body = JSON.stringify(payload);

    response.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      "X-Content-Type-Options": "nosniff", // Boa prática de segurança
    });

    response.end(body);

  } catch {
    // Fallback caso o JSON.stringify falhe
    response.statusCode = 500;
    response.end();
  }
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });

  response.end(html);
}

function notFound(response: ServerResponse): void {
  sendJson(response, 404, {
    error: "Not Found",
    service: serviceName,
  });
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  const { url: _, method } = request;
  const path = request.url?.split("?")[0] ?? "/";

  // Restringindo apenas para o método GET
  if (method !== "GET") {
    return sendJson(response, 405, { error: "Method Not Allowed" });
  }

  if (path === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: serviceName,
      ...runtimeMetadata,
    });
    return;
  }

  if (path === "/") {
    sendHtml(
      response,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${pageTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f4f7fb 0%, #dce6f5 100%);
        color: #12324a;
      }

      main {
        width: min(90vw, 640px);
        padding: 2rem;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 18px 60px rgba(18, 50, 74, 0.14);
      }

      h1 {
        margin: 0 0 1rem;
      }

      p {
        margin: 0.5rem 0;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${pageTitle}</h1>
      <p>${pageDescription}</p>
      <p><strong>Environment:</strong> ${runtimeMetadata.environment}</p>
      <p><strong>Version:</strong> ${runtimeMetadata.version}</p>
    </main>
  </body>
</html>`,
    );
    return;
  }

  // Fallback para 404
  notFound(response);
}

export function createServer(): Server {
  const server = createHttpServer(handleRequest);

  // Timeout para evitar conexões pendentes (importante em Cloud/K8s)
  server.keepAliveTimeout = 61000;
  server.headersTimeout = 62000;

  return server;
}
