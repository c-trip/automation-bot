import { ChannelType, EmbedBuilder, Guild, GuildMember, TextChannel } from "discord.js";
import { discordClient, startBot } from "../bot";
import { env } from "../config/env";
import { getPrisma } from "../lib/prisma";

/**
 * Engineering Project Assistant — Fase 1 (check-in automático) e Fase 2 (follow-up).
 *
 * Tudo aqui é "best effort", no mesmo espírito de stats.service.ts: sem DATABASE_URL
 * configurada, ou sem os canais/cargo configurados, cada função avisa uma vez no log e
 * não faz nada — nunca derruba o resto do bot.
 */

const CHECKIN_TITLE = "📋 Check-in de Desenvolvimento";

function buildCheckInEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(CHECKIN_TITLE)
    .setDescription(
      "Olá equipa! 👋\n\n" +
        "Por favor atualizem o estado das vossas atividades:\n\n" +
        "**1.** O que foi concluído desde o último check-in?\n" +
        "**2.** Em que estão a trabalhar atualmente?\n" +
        "**3.** Existe algum bloqueio ou dificuldade?\n" +
        "**4.** Qual é o próximo passo?\n\n" +
        "💬 Respondam nesta thread."
    )
    .setColor(0x2ecc71)
    .setTimestamp();
}

/** Posta o check-in no canal configurado e abre a thread onde a equipa responde. */
export async function sendCheckIn(): Promise<void> {
  const { channelId } = env.teamCheckin;
  if (!channelId) {
    console.warn(
      "[checkin] DISCORD_CHECKIN_CHANNEL_ID não configurado — check-in automático desativado."
    );
    return;
  }

  await startBot();
  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.warn(`[checkin] Canal ${channelId} não encontrado ou não é um canal de texto.`);
    return;
  }

  const message = await (channel as TextChannel).send({ embeds: [buildCheckInEmbed()] });
  const thread = await message.startThread({
    name: `Check-in — ${new Date().toLocaleDateString("pt-PT")}`,
    autoArchiveDuration: 1440,
  });

  const db = getPrisma();
  if (!db) {
    console.warn(
      "[checkin] DATABASE_URL não configurada — as respostas desta thread não serão " +
        "armazenadas, e os lembretes de 24h e o relatório semanal ficam desativados."
    );
    return;
  }

  await db.checkIn
    .create({ data: { channelId, threadId: thread.id } })
    .catch((err) => console.error("[checkin] Falha ao registar novo check-in:", err));
}

/**
 * Se o último check-in do canal já tem `intervalHours` ou mais, posta um novo.
 * Chamado periodicamente pelo scheduler (ver src/lib/scheduler.ts).
 */
export async function maybeSendCheckIn(): Promise<void> {
  const db = getPrisma();
  const { channelId, intervalHours } = env.teamCheckin;
  if (!db || !channelId) return;

  const latest = await db.checkIn.findFirst({
    where: { channelId },
    orderBy: { createdAt: "desc" },
  });

  const dueMs = intervalHours * 60 * 60 * 1000;
  const isDue = !latest || Date.now() - latest.createdAt.getTime() >= dueMs;
  if (!isDue) return;

  await sendCheckIn();
}

/** Guarda a resposta de um membro da equipa a um check-in, identificado pela thread. */
export async function recordTeamUpdate(
  threadId: string,
  discordUserId: string,
  discordUsername: string,
  content: string
): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const checkIn = await db.checkIn.findUnique({ where: { threadId } });
  if (!checkIn) return;

  await db.teamUpdate
    .create({ data: { checkInId: checkIn.id, discordUserId, discordUsername, content } })
    .catch((err) => console.error("[checkin] Falha ao registar atualização da equipa:", err));
}

/** Membros do servidor com o cargo de equipa configurado (DISCORD_TEAM_ROLE_ID), sem bots. */
export async function getTeamMembers(): Promise<GuildMember[]> {
  const { teamRoleId } = env.teamCheckin;
  const guildId = env.discord.guildId;
  if (!teamRoleId || !guildId) return [];

  let guild: Guild;
  try {
    guild = await discordClient.guilds.fetch(guildId);
  } catch (err) {
    console.error("[checkin] Falha ao buscar o servidor do Discord:", err);
    return [];
  }

  await guild.members.fetch().catch((err) => {
    console.error("[checkin] Falha ao buscar membros do servidor:", err);
  });

  return [...guild.members.cache.filter((m) => m.roles.cache.has(teamRoleId) && !m.user.bot).values()];
}

/**
 * Para o check-in mais recente do canal configurado: se já passou
 * `reminderAfterHours` desde que foi postado, envia um lembrete na thread pra cada
 * membro da equipa que ainda não respondeu e ainda não foi lembrado nesta rodada.
 */
export async function sendPendingReminders(): Promise<void> {
  const db = getPrisma();
  const { channelId, reminderAfterHours } = env.teamCheckin;
  if (!db || !channelId) return;

  const latest = await db.checkIn.findFirst({
    where: { channelId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return;

  const hoursSince = (Date.now() - latest.createdAt.getTime()) / (60 * 60 * 1000);
  if (hoursSince < reminderAfterHours) return;

  const teamMembers = await getTeamMembers();
  if (teamMembers.length === 0) return;

  const [responded, reminded] = await Promise.all([
    db.teamUpdate.findMany({ where: { checkInId: latest.id }, select: { discordUserId: true } }),
    db.checkInReminder.findMany({ where: { checkInId: latest.id }, select: { discordUserId: true } }),
  ]);
  const respondedIds = new Set(responded.map((r) => r.discordUserId));
  const remindedIds = new Set(reminded.map((r) => r.discordUserId));

  const pending = teamMembers.filter((m) => !respondedIds.has(m.id) && !remindedIds.has(m.id));
  if (pending.length === 0) return;

  const thread = await discordClient.channels.fetch(latest.threadId).catch(() => null);
  if (!thread || !thread.isThread()) {
    console.warn(`[checkin] Thread ${latest.threadId} não encontrada — não foi possível lembrar a equipa.`);
    return;
  }

  for (const member of pending) {
    await thread
      .send(`🔔 <@${member.id}>\n\nAinda não recebemos a tua atualização de progresso.`)
      .catch((err) => console.error(`[checkin] Falha ao enviar lembrete para ${member.id}:`, err));

    await db.checkInReminder
      .create({ data: { checkInId: latest.id, discordUserId: member.id } })
      .catch((err) => console.error(`[checkin] Falha ao registar lembrete para ${member.id}:`, err));
  }
}
