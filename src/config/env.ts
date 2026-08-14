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

  // Engineering Project Assistant — check-in automático, follow-up e relatório semanal.
  // Tudo aqui é opcional: sem DATABASE_URL configurada o scheduler nem arranca (ver
  // src/lib/scheduler.ts); sem os IDs abaixo, cada job individual fica desativado e
  // avisa uma vez no log, sem derrubar o resto do bot.
  teamCheckin: {
    // Canal onde o check-in é postado (recomendado: #atualizacoes-diarias).
    channelId: optional("DISCORD_CHECKIN_CHANNEL_ID"),
    // Cargo do Discord que define quem é "equipa" — usado pros lembretes de 24h e pro
    // cálculo de taxa de resposta no relatório semanal.
    teamRoleId: optional("DISCORD_TEAM_ROLE_ID"),
    // Quem recebe o relatório semanal por DM.
    ceoUserId: optional("DISCORD_CEO_USER_ID"),
    intervalHours: Number(process.env.CHECKIN_INTERVAL_HOURS ?? 48),
    reminderAfterHours: Number(process.env.CHECKIN_REMINDER_AFTER_HOURS ?? 24),
    weeklyReportIntervalDays: Number(process.env.WEEKLY_REPORT_INTERVAL_DAYS ?? 7),
    // De quanto em quanto tempo o scheduler verifica se é hora de rodar cada job.
    pollIntervalMinutes: Number(process.env.SCHEDULER_POLL_MINUTES ?? 15),
  },
} as const;
