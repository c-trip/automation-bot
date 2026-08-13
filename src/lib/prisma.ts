import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";
import { PrismaClient } from "../generated/prisma/client";

// Prisma 7 usa driver adapters — a URL de conexão não vem mais do schema.prisma,
// é passada aqui diretamente pro adapter do node-postgres.
//
// O client é criado sob demanda (não no import do módulo) e só se DATABASE_URL
// estiver configurada. Isso mantém o bot funcionando sem banco: as notificações do
// GitHub continuam normais, só /stats, /leaderboard e os lembretes automáticos ficam
// desativados até o Postgres ser configurado.
let client: PrismaClient | null = null;
let warned = false;

export function getPrisma(): PrismaClient | null {
  if (!env.database.url) {
    if (!warned) {
      console.warn(
        "[db] DATABASE_URL não configurada — /stats, /leaderboard e lembretes automáticos " +
          "ficam desativados. As notificações do GitHub continuam funcionando normalmente."
      );
      warned = true;
    }
    return null;
  }

  if (!client) {
    const adapter = new PrismaPg({ connectionString: env.database.url });
    client = new PrismaClient({ adapter });
  }

  return client;
}
