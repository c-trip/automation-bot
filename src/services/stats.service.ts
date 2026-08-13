import { getPrisma } from "../lib/prisma";
import type {
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from "../types/github";

/**
 * Toda persistência aqui é "best effort": se o banco não estiver configurado
 * (getPrisma() === null) ou der erro, apenas logamos e seguimos — nunca deixamos
 * uma falha de banco derrubar o processamento do webhook ou o envio pro Discord.
 */
async function safely(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[db] Falha ao ${label}:`, err);
  }
}

export async function recordPullRequestEvent(payload: PullRequestEvent): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const { action, pull_request: pr, repository } = payload;
  const repo = repository.full_name;
  const where = { repo_number: { repo, number: pr.number } };
  const base = { repo, number: pr.number, title: pr.title, authorLogin: pr.user.login };

  if (action === "opened" || action === "reopened") {
    await safely(`registar PR #${pr.number} (${action})`, () =>
      db.pullRequest.upsert({
        where,
        create: { ...base, state: "open", draft: pr.draft, openedAt: new Date() },
        update: { state: "open", draft: pr.draft, closedAt: null, mergedAt: null },
      })
    );
    return;
  }

  if (action === "ready_for_review") {
    await safely(`marcar PR #${pr.number} como pronta para review`, () =>
      db.pullRequest.upsert({
        where,
        create: { ...base, state: "open", draft: false, openedAt: new Date() },
        update: { draft: false },
      })
    );
    return;
  }

  if (action === "review_requested") {
    await safely(`registar review solicitada na PR #${pr.number}`, () =>
      db.pullRequest.upsert({
        where,
        create: { ...base, state: "open", draft: pr.draft, openedAt: new Date(), reviewRequestedAt: new Date() },
        update: { reviewRequestedAt: new Date(), reviewReminderSentAt: null },
      })
    );
    return;
  }

  if (action === "closed") {
    const now = new Date();
    await safely(`fechar PR #${pr.number} (merged=${pr.merged})`, () =>
      db.pullRequest.upsert({
        where,
        create: {
          ...base,
          state: pr.merged ? "merged" : "closed",
          draft: pr.draft,
          openedAt: now,
          closedAt: now,
          mergedAt: pr.merged ? now : null,
        },
        update: {
          state: pr.merged ? "merged" : "closed",
          closedAt: now,
          mergedAt: pr.merged ? now : null,
        },
      })
    );
  }
}

export async function recordPullRequestReviewEvent(payload: PullRequestReviewEvent): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const { pull_request: pr, repository } = payload;
  const repo = repository.full_name;

  await safely(`registar review na PR #${pr.number}`, async () => {
    const existing = await db.pullRequest.findUnique({
      where: { repo_number: { repo, number: pr.number } },
    });
    if (!existing) return;
    if (existing.firstReviewAt) return;

    await db.pullRequest.update({
      where: { repo_number: { repo, number: pr.number } },
      data: { firstReviewAt: new Date() },
    });
  });
}

export async function recordIssueEvent(payload: IssuesEvent): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const { action, issue, repository } = payload;
  // issue_comment/issues também disparam pra PRs (toda PR é uma issue) — não misturamos
  // esse histórico com o de PullRequest, então ignoramos aqui.
  if (issue.pull_request) return;

  const repo = repository.full_name;
  const where = { repo_number: { repo, number: issue.number } };
  const base = { repo, number: issue.number, title: issue.title, authorLogin: issue.user.login };
  const now = new Date();

  if (action === "opened" || action === "reopened") {
    await safely(`registar issue #${issue.number} (${action})`, () =>
      db.issue.upsert({
        where,
        create: { ...base, state: "open", openedAt: now, lastActivityAt: now },
        update: { state: "open", closedAt: null, lastActivityAt: now, staleReminderSentAt: null },
      })
    );
    return;
  }

  if (action === "closed") {
    await safely(`fechar issue #${issue.number}`, () =>
      db.issue.upsert({
        where,
        create: { ...base, state: "closed", openedAt: now, closedAt: now, lastActivityAt: now },
        update: { state: "closed", closedAt: now, lastActivityAt: now },
      })
    );
    return;
  }

  if (action === "assigned" || action === "unassigned") {
    await safely(`atualizar atividade da issue #${issue.number}`, () =>
      db.issue.updateMany({ where: { repo, number: issue.number }, data: { lastActivityAt: now } })
    );
  }
}

export async function recordBuildRun(payload: WorkflowRunEvent): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  const { workflow_run: run, repository } = payload;
  if (run.status !== "completed") return;
  if (run.conclusion !== "success" && run.conclusion !== "failure") return;

  // Captura o valor já estreitado ("success" | "failure") numa variável própria —
  // dentro da closure abaixo o TS não mantém o narrowing de `run.conclusion`.
  const conclusion = run.conclusion;

  await safely(`registar build ${run.name} #${run.run_number}`, () =>
    db.buildRun.upsert({
      where: {
        repo_workflowName_runNumber: {
          repo: repository.full_name,
          workflowName: run.name,
          runNumber: run.run_number,
        },
      },
      create: {
        repo: repository.full_name,
        workflowName: run.name,
        runNumber: run.run_number,
        branch: run.head_branch,
        conclusion,
        finishedAt: new Date(),
      },
      update: { conclusion, finishedAt: new Date() },
    })
  );
}

export interface RepoStats {
  prsOpened: number;
  prsMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  buildsFailed: number;
}

/** Estatísticas dos últimos `days` dias. Retorna `null` se o banco não estiver configurado. */
export async function getStats(days = 30): Promise<RepoStats | null> {
  const db = getPrisma();
  if (!db) return null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [prsOpened, prsMerged, issuesOpened, issuesClosed, buildsFailed] = await Promise.all([
    db.pullRequest.count({ where: { openedAt: { gte: since } } }),
    db.pullRequest.count({ where: { mergedAt: { gte: since } } }),
    db.issue.count({ where: { openedAt: { gte: since } } }),
    db.issue.count({ where: { closedAt: { gte: since } } }),
    db.buildRun.count({ where: { conclusion: "failure", finishedAt: { gte: since } } }),
  ]);

  return { prsOpened, prsMerged, issuesOpened, issuesClosed, buildsFailed };
}

export interface LeaderboardEntry {
  login: string;
  mergedCount: number;
}

/** Ranking por PRs mergeadas nos últimos `days` dias. Retorna `null` se o banco não estiver configurado. */
export async function getLeaderboard(days = 30, limit = 10): Promise<LeaderboardEntry[] | null> {
  const db = getPrisma();
  if (!db) return null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db.pullRequest.groupBy({
    by: ["authorLogin"],
    where: { state: "merged", mergedAt: { gte: since } },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: limit,
  });

  return rows.map((row) => ({ login: row.authorLogin, mergedCount: row._count.authorLogin }));
}
