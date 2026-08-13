import * as leaderboard from "./leaderboard";
import * as stats from "./stats";

/** Todos os slash commands do bot — usado tanto no registro (scripts/register-commands.ts)
 *  quanto no handler de interações (src/bot.ts). */
export const commands = [stats, leaderboard];
