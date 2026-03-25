import { createServer } from "./app.js";

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";

const server = createServer();

server.listen(port, host, () => {
  console.log(`${host}:${port} ${process.env.SERVICE_NAME ?? "landing"} ready`);
});

const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Closed out remaining connections.");
    process.exit(0);
  });

  // Força a saída após 10s se não fechar naturalmente
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
