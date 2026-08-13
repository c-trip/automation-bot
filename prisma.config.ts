// Config do Prisma CLI (migrate, studio) — Prisma 7 não lê mais a URL de conexão
// do schema.prisma, ela vem daqui. O runtime (PrismaClient) usa o driver adapter em
// src/lib/prisma.ts, que também lê DATABASE_URL diretamente.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
