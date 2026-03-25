import { createServer as createHttpServer, IncomingMessage, Server, ServerResponse } from "node:http";

const serviceName = "backend";
const serviceDescription = "API service used to validate the CI/CD pipeline end-to-end.";
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
    sendJson(response, 200, {
      service: serviceName,
      description: serviceDescription,
      ...runtimeMetadata,
    });
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
