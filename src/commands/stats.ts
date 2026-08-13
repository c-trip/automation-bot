import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getStats } from "../services/stats.service";

export const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Mostra estatísticas de PRs, issues e builds do repositório")
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

  const stats = await getStats(days);
  if (!stats) {
    await interaction.editReply(
      "⚠️ Banco de dados não configurado — `/stats` está indisponível. Configure `DATABASE_URL` no `.env`."
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 Estatísticas — últimos ${days} dias`)
    .addFields(
      { name: "🔀 PRs abertas", value: String(stats.prsOpened), inline: true },
      { name: "✅ PRs mergeadas", value: String(stats.prsMerged), inline: true },
      { name: "🐛 Issues abertas", value: String(stats.issuesOpened), inline: true },
      { name: "✔️ Issues fechadas", value: String(stats.issuesClosed), inline: true },
      { name: "❌ Builds falhados", value: String(stats.buildsFailed), inline: true }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
