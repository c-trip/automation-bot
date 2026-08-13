import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { commands } from "./commands";
import { env } from "./config/env";

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[discord] Falha ao executar /${interaction.commandName}:`, err);
    const content = "❌ Ocorreu um erro ao executar este comando.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content).catch(() => {});
    } else {
      await interaction.reply({ content, ephemeral: true }).catch(() => {});
    }
  }
});

let readyPromise: Promise<void> | null = null;

export function startBot(): Promise<void> {
  if (!readyPromise) {
    readyPromise = new Promise((resolve, reject) => {
      discordClient.once(Events.ClientReady, () => {
        console.log(`[discord] Conectado como ${discordClient.user?.tag}`);
        resolve();
      });
      discordClient.once(Events.Error, reject);
      discordClient.login(env.discord.token).catch(reject);
    });
  }
  return readyPromise;
}
