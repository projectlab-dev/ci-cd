import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createServer } from "../src/app.js"; // ajuste o caminho se necessário

describe("Frontend Service Integration Tests", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("should return HTML with the correct title on root path (/) ", async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    
    // Valida se o título e a descrição estão no HTML retornado
    expect(body).toContain("<title>Frontend Service</title>");
    expect(body).toContain("<h1>Frontend Service</h1>");
    expect(body).toMatch(/Frontend placeholder used to validate/);
  });

  it("should return JSON on /health", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toMatchObject({
      service: "frontend",
      status: "ok"
    });
  });

  it("should return 405 for non-GET methods", async () => {
    const response = await fetch(`${baseUrl}/`, { method: "POST" });
    expect(response.status).toBe(405);
  });

  it("should return 404 for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/any-route`);
    expect(response.status).toBe(404);
  });
});