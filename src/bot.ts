import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
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
