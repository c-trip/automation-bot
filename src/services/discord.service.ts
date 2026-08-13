import { EmbedBuilder, TextChannel } from "discord.js";
import { discordClient, startBot } from "../bot";

/**
 * Envia um embed para um canal do Discord pelo ID.
 * Garante que o bot já esteja logado antes de tentar buscar o canal.
 */
export async function sendEmbedToChannel(
  channelId: string | undefined,
  embed: EmbedBuilder
): Promise<void> {
  if (!channelId) {
    console.warn(
      "[discord] Nenhum canal configurado para este evento — mensagem descartada. " +
        "Configure DISCORD_CHANNEL_PRS / DISCORD_CHANNEL_BUILDS / DISCORD_CHANNEL_ISSUES ou DISCORD_CHANNEL_ID no .env."
    );
    return;
  }

  await startBot();

  const channel = await discordClient.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    console.warn(`[discord] Canal ${channelId} não encontrado ou não é um canal de texto.`);
    return;
  }

  await channel.send({ embeds: [embed] });
}
