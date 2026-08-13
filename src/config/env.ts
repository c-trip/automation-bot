import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Confira o arquivo .env (veja .env.example).`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),

  discord: {
    token: required("DISCORD_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
    guildId: optional("DISCORD_GUILD_ID"),
    channels: {
      default: optional("DISCORD_CHANNEL_ID"),
      prs: optional("DISCORD_CHANNEL_PRS") ?? optional("DISCORD_CHANNEL_ID"),
      builds: optional("DISCORD_CHANNEL_BUILDS") ?? optional("DISCORD_CHANNEL_ID"),
      issues: optional("DISCORD_CHANNEL_ISSUES") ?? optional("DISCORD_CHANNEL_ID"),
      deploys: optional("DISCORD_CHANNEL_DEPLOYS") ?? optional("DISCORD_CHANNEL_ID"),
    },
  },

  github: {
    webhookSecret: required("GITHUB_WEBHOOK_SECRET"),
  },

  database: {
    // Opcional de propósito: sem ela, o bot continua funcionando normalmente para as
    // notificações do GitHub — só /stats, /leaderboard e os lembretes automáticos
    // ficam desativados (ver src/lib/prisma.ts).
    url: optional("DATABASE_URL"),
  },
} as const;
