import { EmbedBuilder } from "discord.js";
import { discordClient, startBot } from "../bot";
import { env } from "../config/env";
import { getPrisma } from "../lib/prisma";
import { getTeamMembers } from "./checkin.service";
import { getLeaderboard, getStats } from "./stats.service";

/**
 * Engineering Project Assistant — Fase 3 (relatório semanal).
 *
 * Gera um texto narrativo em português a partir dos dados já coletados pelo bot
 * (PRs/issues/builds via stats.service + respostas de check-in), sem depender de
 * nenhuma API externa. A ideia é ler como um resumo escrito por alguém da equipa, não
 * como uma lista de métricas cruas.
 */

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-PT", DATE_FORMAT);
}

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

interface WeeklyReportData {
  periodStart: Date;
  periodEnd: Date;
  stats: Awaited<ReturnType<typeof getStats>>;
  leaderboard: Awaited<ReturnType<typeof getLeaderboard>>;
  teamSize: number;
  responded: { discordUserId: string; discordUsername: string; content: string }[];
}

async function collectWeeklyReportData(periodStart: Date, periodEnd: Date): Promise<WeeklyReportData> {
  const db = getPrisma();

  const [stats, leaderboard, teamMembers, updates] = await Promise.all([
    getStats(7),
    getLeaderboard(7, 3),
    getTeamMembers(),
    db
      ? db.teamUpdate.findMany({
          where: { createdAt: { gte: periodStart, lte: periodEnd } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Uma entrada por pessoa — a mais recente da semana, que é a que melhor reflete onde
  // ela está agora.
  const latestByUser = new Map<string, { discordUserId: string; discordUsername: string; content: string }>();
  for (const update of updates) {
    if (!latestByUser.has(update.discordUserId)) {
      latestByUser.set(update.discordUserId, update);
    }
  }

  return {
    periodStart,
    periodEnd,
    stats,
    leaderboard,
    teamSize: teamMembers.length,
    responded: [...latestByUser.values()],
  };
}

function buildNarrative(data: WeeklyReportData): string {
  const { stats, leaderboard, teamSize, responded } = data;
  const paragraphs: string[] = [];

  paragraphs.push(
    `Boa! Aqui vai o resumo da semana de **${formatDate(data.periodStart)}** a **${formatDate(data.periodEnd)}**.`
  );

  if (stats) {
    const delivered = stats.prsMerged + stats.issuesClosed;
    const vibe =
      delivered === 0
        ? "Foi uma semana mais parada em termos de entregas fechadas."
        : delivered >= 8
          ? "Foi uma semana bem movimentada, com bastante coisa saindo do forno."
          : "Foi uma semana de ritmo constante.";

    const prLabel = stats.prsMerged === 1 ? "PR mergeada" : "PRs mergeadas";
    const openedLabel = stats.prsOpened === 1 ? "PR aberta" : "PRs abertas";
    const issueOpenLabel = stats.issuesOpened === 1 ? "issue aberta" : "issues abertas";
    const issueCloseLabel = stats.issuesClosed === 1 ? "issue fechada" : "issues fechadas";

    paragraphs.push(
      `${vibe} No código: ${stats.prsOpened} ${openedLabel} e ${stats.prsMerged} ${prLabel}. ` +
        `Do lado das issues: ${stats.issuesOpened} ${issueOpenLabel} e ${stats.issuesClosed} ${issueCloseLabel}.`
    );

    const buildLine =
      stats.buildsFailed === 0
        ? "O CI esteve estável essa semana — nenhuma build falhou. 👍"
        : `O CI teve solavancos: ${stats.buildsFailed} build${stats.buildsFailed === 1 ? "" : "s"} falh${stats.buildsFailed === 1 ? "ou" : "aram"} — vale revisar antes que vire hábito.`;
    paragraphs.push(buildLine);

    if (leaderboard && leaderboard.length > 0) {
      const top = leaderboard[0];
      const prWord = top.mergedCount === 1 ? "PR" : "PRs";
      paragraphs.push(
        `Destaque da semana: **${top.login}** liderou com ${top.mergedCount} ${prWord} mergeada${top.mergedCount === 1 ? "" : "s"}. 🏆`
      );
    }
  } else {
    paragraphs.push(
      "⚠️ Não consegui buscar as métricas de PRs/issues/builds (banco de dados indisponível)."
    );
  }

  if (teamSize > 0) {
    const respondedCount = responded.length;
    const pct = Math.round((respondedCount / teamSize) * 100);
    const participationLine =
      pct === 100
        ? "Participação perfeita nos check-ins — todo mundo deu notícia. 🙌"
        : pct >= 50
          ? "Boa parte da equipa deu notícia nos check-ins desta semana."
          : "Poucas pessoas responderam aos check-ins esta semana — pode valer reforçar o hábito.";
    paragraphs.push(
      `Nos check-ins: ${respondedCount} de ${teamSize} membros da equipa (${pct}%) responderam esta semana. ${participationLine}`
    );
  } else {
    paragraphs.push(
      "ℹ️ Nenhum cargo de equipa configurado (`DISCORD_TEAM_ROLE_ID`) — não dá pra medir participação nos check-ins ainda."
    );
  }

  if (responded.length > 0) {
    const MAX_QUOTES = 8;
    const quotes = responded
      .slice(0, MAX_QUOTES)
      .map((u) => `> **${u.discordUsername}**: ${truncate(u.content, 240)}`)
      .join("\n");
    const extra = responded.length > MAX_QUOTES ? `\n\n_...e mais ${responded.length - MAX_QUOTES} atualização(ões)._` : "";
    paragraphs.push(`**O que a equipa disse:**\n${quotes}${extra}`);
  }

  paragraphs.push("— Joyce 🤖, de olho no progresso da equipa.");

  return paragraphs.join("\n\n");
}

async function buildWeeklyReportEmbed(periodStart: Date, periodEnd: Date): Promise<EmbedBuilder> {
  const data = await collectWeeklyReportData(periodStart, periodEnd);
  const narrative = buildNarrative(data);

  return new EmbedBuilder()
    .setTitle(`🗞️ Relatório Semanal — ${formatDate(periodStart)} a ${formatDate(periodEnd)}`)
    .setDescription(truncate(narrative, 4000))
    .setColor(0x8e44ad)
    .setTimestamp();
}

/** Gera o relatório semanal e envia por DM pra DISCORD_CEO_USER_ID. */
export async function sendWeeklyReport(): Promise<void> {
  const db = getPrisma();
  if (!db) {
    console.warn("[report] DATABASE_URL não configurada — relatório semanal desativado.");
    return;
  }

  const { ceoUserId } = env.teamCheckin;
  if (!ceoUserId) {
    console.warn("[report] DISCORD_CEO_USER_ID não configurado — relatório semanal desativado.");
    return;
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const embed = await buildWeeklyReportEmbed(periodStart, periodEnd);

  await startBot();
  const user = await discordClient.users.fetch(ceoUserId).catch((err) => {
    console.error(`[report] Falha ao buscar utilizador ${ceoUserId}:`, err);
    return null;
  });
  if (!user) return;

  const sent = await user
    .send({ embeds: [embed] })
    .then(() => true)
    .catch((err) => {
      console.error(`[report] Falha ao enviar DM para ${ceoUserId}:`, err);
      return false;
    });
  if (!sent) return;

  await db.weeklyReportLog
    .create({ data: { periodStart, periodEnd } })
    .catch((err) => console.error("[report] Falha ao registar envio do relatório:", err));
}

/**
 * Envia o relatório semanal se já passou `weeklyReportIntervalDays` desde o último
 * envio. Chamado periodicamente pelo scheduler (ver src/lib/scheduler.ts).
 */
export async function maybeSendWeeklyReport(): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const latest = await db.weeklyReportLog.findFirst({ orderBy: { sentAt: "desc" } });
  const dueMs = env.teamCheckin.weeklyReportIntervalDays * 24 * 60 * 60 * 1000;
  const isDue = !latest || Date.now() - latest.sentAt.getTime() >= dueMs;
  if (!isDue) return;

  await sendWeeklyReport();
}
