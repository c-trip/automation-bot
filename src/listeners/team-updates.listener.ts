import { Events } from "discord.js";
import { discordClient } from "../bot";
import { recordTeamUpdate } from "../services/checkin.service";

/**
 * Escuta mensagens em qualquer thread do servidor e tenta gravá-las como resposta de
 * check-in. `recordTeamUpdate` só grava algo se a thread corresponder a um check-in
 * conhecido (ver checkin.service.ts) — mensagens em qualquer outra thread são
 * ignoradas silenciosamente, então não há necessidade de filtrar por canal aqui.
 *
 * Fica num arquivo separado (em vez de dentro de bot.ts) só pra evitar import
 * circular: checkin.service.ts precisa do `discordClient` exportado por bot.ts.
 */
export function registerTeamUpdateListener(): void {
  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    const content = message.content?.trim();
    if (!content) return;

    await recordTeamUpdate(message.channel.id, message.author.id, message.author.username, content).catch(
      (err) => console.error("[checkin] Falha ao processar mensagem da thread:", err)
    );
  });
}
