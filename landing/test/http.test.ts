import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createServer } from "../src/app.js"; // ajuste o caminho conforme sua estrutura

describe("Landing Service Integration Tests", () => {
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

  describe("GET /", () => {
    it("should return HTML with landing page identity", async () => {
      const response = await fetch(`${baseUrl}/`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      
      // Validação de Identidade (Textos)
      expect(body).toContain("<title>Landing Service</title>");
      expect(body).toContain("<h1>Landing Service</h1>");
      expect(body).toContain("shared deployment pipeline");

      // Validação de Identidade (Visual/CSS)
      // Garantimos que o gradiente específico do landing (amarelado/dourado) está lá
      expect(body).toContain("radial-gradient(circle at top, #fff6dd");
      expect(body).toContain("background: rgba(255, 250, 240, 0.94)");
    });
  });

  describe("GET /health", () => {
    it("should return JSON with landing metadata", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        service: "landing",
        status: "ok",
      });
      expect(body).toHaveProperty("environment");
      expect(body).toHaveProperty("version");
    });
  });

  describe("Edge Cases", () => {
    it("should return 405 for POST method", async () => {
      const response = await fetch(`${baseUrl}/`, { method: "POST" });
      expect(response.status).toBe(405);
      
      const body = await response.json();
      expect(body.error).toBe("Method Not Allowed");
    });

    it("should return 404 for non-existent routes", async () => {
      const response = await fetch(`${baseUrl}/not-found-path`);
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.service).toBe("landing");
    });
  });
});