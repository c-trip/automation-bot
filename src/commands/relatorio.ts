import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getPrisma } from "../lib/prisma";
import { env } from "../config/env";
import { sendWeeklyReport } from "../services/report.service";

export const data = new SlashCommandBuilder()
  .setName("relatorio")
  .setDescription("Gera e envia o relatório semanal agora, fora do ciclo automático")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!getPrisma()) {
    await interaction.editReply(
      "⚠️ Banco de dados não configurado — configure `DATABASE_URL` no `.env`."
    );
    return;
  }
  if (!env.teamCheckin.ceoUserId) {
    await interaction.editReply(
      "⚠️ `DISCORD_CEO_USER_ID` não configurado — defina quem recebe o relatório no `.env`."
    );
    return;
  }

  await sendWeeklyReport();
  await interaction.editReply("✅ Relatório semanal enviado por DM.");
}
