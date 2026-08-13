// Registra os slash commands (/stats, /leaderboard) na API do Discord.
//
// Se DISCORD_GUILD_ID estiver definido no .env, registra só nesse servidor — mudanças
// aparecem quase na hora, ideal em desenvolvimento. Sem ele, registra globalmente, o que
// pode levar até 1h para propagar em todos os servidores.
//
// Uso: pnpm commands:register

import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "../src/commands";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("❌ DISCORD_TOKEN e DISCORD_CLIENT_ID precisam estar definidos no .env");
  process.exit(1);
}

async function main(): Promise<void> {
  const rest = new REST().setToken(token!);
  const body = commands.map((command) => command.data.toJSON());

  const route = guildId
    ? Routes.applicationGuildCommands(clientId!, guildId)
    : Routes.applicationCommands(clientId!);

  await rest.put(route, { body });

  const names = body.map((command) => `/${command.name}`).join(", ");
  const destino = guildId ? `no servidor ${guildId}` : "globalmente (pode levar até 1h para aparecer)";
  console.log(`✅ ${body.length} comando(s) registrado(s) ${destino}: ${names}`);
}

main().catch((err) => {
  console.error("❌ Falha ao registrar comandos:", err);
  process.exit(1);
});
