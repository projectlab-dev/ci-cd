import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createServer } from "../src/app.js";

describe("Backend API Integration Tests", () => {
  let server: Server;
  let baseUrl: string;

  // Sobe o servidor uma única vez para todos os testes deste arquivo
  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      // Porta 0 deixa o SO escolher uma porta livre
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  // Garante que o servidor feche após os testes, mesmo se houver falha
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("should return 200 and 'ok' status on /health", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      service: "backend",
      status: "ok",
    });
    // Verifica se os metadados existem
    expect(body).toHaveProperty("environment");
    expect(body).toHaveProperty("version");
  });

  it("should return 200 and description on root path /", async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.service).toBe("backend");
    expect(body.description).toBeDefined();
  });

  it("should return 405 when using a non-GET method", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      method: "POST",
    });

    expect(response.status).toBe(405);
  });

  it("should return 404 for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/undefined-route`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Not Found");
  });
});