import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getPrisma } from "../lib/prisma";
import { sendCheckIn } from "../services/checkin.service";
import { env } from "../config/env";

export const data = new SlashCommandBuilder()
  .setName("checkin")
  .setDescription("Envia o check-in de desenvolvimento agora, fora do ciclo automático")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!getPrisma()) {
    await interaction.editReply(
      "⚠️ Banco de dados não configurado — configure `DATABASE_URL` no `.env` pra armazenar as respostas."
    );
    return;
  }
  if (!env.teamCheckin.channelId) {
    await interaction.editReply(
      "⚠️ `DISCORD_CHECKIN_CHANNEL_ID` não configurado — defina o canal de check-in no `.env`."
    );
    return;
  }

  await sendCheckIn();
  await interaction.editReply("✅ Check-in enviado.");
}
