import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getLeaderboard } from "../services/stats.service";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Ranking de quem mais mergeou Pull Requests")
  .addIntegerOption((option) =>
    option
      .setName("dias")
      .setDescription("Janela de tempo em dias (padrão: 30)")
      .setMinValue(1)
      .setMaxValue(365)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const days = interaction.options.getInteger("dias") ?? 30;
  await interaction.deferReply();

  const entries = await getLeaderboard(days);
  if (!entries) {
    await interaction.editReply(
      "⚠️ Banco de dados não configurado — `/leaderboard` está indisponível. Configure `DATABASE_URL` no `.env`."
    );
    return;
  }

  if (entries.length === 0) {
    await interaction.editReply(`Nenhuma PR mergeada nos últimos ${days} dias.`);
    return;
  }

  const lines = entries.map((entry, index) => {
    const rank = MEDALS[index] ?? `${index + 1}.`;
    const prLabel = entry.mergedCount === 1 ? "PR" : "PRs";
    return `${rank} **${entry.login}** — ${entry.mergedCount} ${prLabel} mergeada${entry.mergedCount === 1 ? "" : "s"}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Leaderboard — últimos ${days} dias`)
    .setDescription(lines.join("\n"))
    .setColor(0xf1c40f)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
