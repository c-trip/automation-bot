import { env } from "../config/env";
import { maybeSendCheckIn, sendPendingReminders } from "../services/checkin.service";
import { maybeSendWeeklyReport } from "../services/report.service";
import { getPrisma } from "./prisma";

/**
 * Roda `fn` a cada `everyMs`, sem sobrepor execuções (se uma varredura demorar mais que
 * o intervalo, a próxima só começa quando a atual terminar) e sem deixar um erro
 * derrubar o processo — mesma filosofia "best effort" do resto do bot.
 */
function runEvery(label: string, everyMs: number, fn: () => Promise<void>): void {
  let running = false;

  setInterval(() => {
    if (running) return;
    running = true;
    fn()
      .catch((err) => console.error(`[scheduler] Falha no job "${label}":`, err))
      .finally(() => {
        running = false;
      });
  }, everyMs);
}

/**
 * Liga os jobs do Engineering Project Assistant: check-in a cada N horas, lembrete de
 * 24h pra quem não respondeu, e relatório semanal. Só arranca se DATABASE_URL estiver
 * configurada — sem banco não há como rastrear check-ins nem evitar reenviar
 * lembretes/relatórios a cada varredura.
 */
export function startSchedulers(): void {
  if (!getPrisma()) {
    console.warn(
      "[scheduler] DATABASE_URL não configurada — check-in automático, lembretes e " +
        "relatório semanal ficam desativados."
    );
    return;
  }

  const pollMs = env.teamCheckin.pollIntervalMinutes * 60 * 1000;

  runEvery("check-in automático", pollMs, maybeSendCheckIn);
  runEvery("lembrete de check-in", pollMs, sendPendingReminders);
  runEvery("relatório semanal", pollMs, maybeSendWeeklyReport);

  console.log(
    `[scheduler] Jobs ligados — verificação a cada ${env.teamCheckin.pollIntervalMinutes} min ` +
      `(check-in a cada ${env.teamCheckin.intervalHours}h, lembrete após ${env.teamCheckin.reminderAfterHours}h, ` +
      `relatório a cada ${env.teamCheckin.weeklyReportIntervalDays}d).`
  );
}
