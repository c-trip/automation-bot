import Fastify from "fastify";
import { startBot } from "./bot";
import { env } from "./config/env";
import { githubRoutes } from "./routes/github";

async function main(): Promise<void> {
  const fastify = Fastify({ logger: true });

  fastify.get("/saude", async () => ({ status: "ok" }));

  await fastify.register(githubRoutes);

  await startBot();

  await fastify.listen({ port: env.port, host: "0.0.0.0" });
  fastify.log.info(`Joyce Bot rodando na porta ${env.port}`);
}

main().catch((err) => {
  console.error("[server] Falha ao iniciar:", err);
  process.exit(1);
});
