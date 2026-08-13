import { createHmac, timingSafeEqual } from "node:crypto";
import { EmbedBuilder } from "discord.js";
import { env } from "../config/env";
import type {
  DeploymentStatusEvent,
  GitHubComment,
  GitHubRepository,
  IssueCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from "../types/github";

const COLORS = {
  green: 0x2ecc71,
  red: 0xe74c3c,
  blue: 0x3498db,
  purple: 0x9b59b6,
  gray: 0x95a5a6,
} as const;

const COMMENT_PREVIEW_LIMIT = 300;

/** Corta um texto longo (ex.: corpo de comentário) para caber num embed. */
function truncate(text: string, limit: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trimEnd()}…`;
}

/**
 * Valida a assinatura HMAC SHA-256 enviada pelo GitHub no header
 * `x-hub-signature-256`, usando o corpo bruto (raw) da requisição.
 */
export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + createHmac("sha256", env.github.webhookSecret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function buildPullRequestEmbed(payload: PullRequestEvent): EmbedBuilder | null {
  const { action, pull_request: pr, repository } = payload;

  if (action === "opened") {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🔀 PR #${pr.number} aberta: ${pr.title}`)
      .setURL(pr.html_url)
      .setDescription(`\`${pr.head.ref}\` → \`${pr.base.ref}\``)
      .setAuthor({ name: pr.user.login, iconURL: pr.user.avatar_url, url: pr.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "reopened") {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🔄 PR #${pr.number} reaberta: ${pr.title}`)
      .setURL(pr.html_url)
      .setDescription(`\`${pr.head.ref}\` → \`${pr.base.ref}\``)
      .setAuthor({ name: pr.user.login, iconURL: pr.user.avatar_url, url: pr.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "ready_for_review") {
    const reviewers = pr.requested_reviewers?.length
      ? pr.requested_reviewers.map((reviewer) => `@${reviewer.login}`).join(", ")
      : "Nenhum reviewer definido ainda";

    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🔍 PR #${pr.number} pronta para review: ${pr.title}`)
      .setURL(pr.html_url)
      .setDescription(`Reviewers: ${reviewers}`)
      .setAuthor({ name: pr.user.login, iconURL: pr.user.avatar_url, url: pr.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "review_requested") {
    const reviewerName = payload.requested_reviewer?.login ?? payload.requested_team?.name;
    if (!reviewerName) return null;

    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`👀 Review solicitada: ${pr.title}`)
      .setURL(pr.html_url)
      .setDescription(`PR: #${pr.number}\nReviewer: @${reviewerName}`)
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "closed" && pr.merged) {
    return new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(`✅ PR #${pr.number} mergeada: ${pr.title}`)
      .setURL(pr.html_url)
      .setAuthor({ name: pr.user.login, iconURL: pr.user.avatar_url, url: pr.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "closed" && !pr.merged) {
    return new EmbedBuilder()
      .setColor(COLORS.gray)
      .setTitle(`🚫 PR #${pr.number} fechada sem merge: ${pr.title}`)
      .setURL(pr.html_url)
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  return null;
}

export function buildPullRequestReviewEmbed(payload: PullRequestReviewEvent): EmbedBuilder | null {
  const { review, pull_request: pr, repository } = payload;

  if (review.state !== "approved") return null;

  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle(`👍 PR #${pr.number} aprovada: ${pr.title}`)
    .setURL(review.html_url)
    .setAuthor({ name: review.user.login, iconURL: review.user.avatar_url, url: review.user.html_url })
    .setFooter({ text: repository.full_name })
    .setTimestamp();
}

export function buildWorkflowRunEmbed(payload: WorkflowRunEvent): EmbedBuilder | null {
  const { workflow_run: run, repository } = payload;

  if (run.status === "in_progress") {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🏗️ Build iniciada: ${run.name} #${run.run_number}`)
      .setURL(run.html_url)
      .setDescription(`Branch: \`${run.head_branch}\``)
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (run.status !== "completed") return null;
  if (run.conclusion !== "success" && run.conclusion !== "failure") return null;

  const isSuccess = run.conclusion === "success";

  return new EmbedBuilder()
    .setColor(isSuccess ? COLORS.green : COLORS.red)
    .setTitle(
      `${isSuccess ? "✅" : "❌"} Build ${isSuccess ? "concluída" : "falhou"}: ${run.name} #${run.run_number}`
    )
    .setURL(run.html_url)
    .setDescription(`Branch: \`${run.head_branch}\``)
    .setFooter({ text: repository.full_name })
    .setTimestamp();
}

export function buildIssueEmbed(payload: IssuesEvent): EmbedBuilder | null {
  const { action, issue, repository } = payload;

  if (action === "opened") {
    const assignees = issue.assignees?.length
      ? issue.assignees.map((assignee) => `@${assignee.login}`).join(", ")
      : undefined;

    const embed = new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🐛 Issue #${issue.number} aberta: ${issue.title}`)
      .setURL(issue.html_url)
      .setAuthor({ name: issue.user.login, iconURL: issue.user.avatar_url, url: issue.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();

    if (assignees) embed.setDescription(`Responsável: ${assignees}`);

    return embed;
  }

  if (action === "assigned" && issue.assignee) {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`👤 Issue #${issue.number} atribuída: ${issue.title}`)
      .setURL(issue.html_url)
      .setDescription(`Responsável: [@${issue.assignee.login}](${issue.assignee.html_url})`)
      .setAuthor({ name: issue.user.login, iconURL: issue.user.avatar_url, url: issue.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "unassigned") {
    return new EmbedBuilder()
      .setColor(COLORS.gray)
      .setTitle(`👤 Issue #${issue.number} desatribuída: ${issue.title}`)
      .setURL(issue.html_url)
      .setAuthor({ name: issue.user.login, iconURL: issue.user.avatar_url, url: issue.user.html_url })
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "closed") {
    return new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(`✔️ Issue #${issue.number} encerrada: ${issue.title}`)
      .setURL(issue.html_url)
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  if (action === "reopened") {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🔄 Issue #${issue.number} reaberta: ${issue.title}`)
      .setURL(issue.html_url)
      .setFooter({ text: repository.full_name })
      .setTimestamp();
  }

  return null;
}

/** Embed compartilhado por `issue_comment` (em PRs) e `pull_request_review_comment`. */
function buildCommentEmbed(
  prNumber: number,
  comment: GitHubComment,
  repository: GitHubRepository
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle(`💬 Novo comentário na PR #${prNumber}`)
    .setURL(comment.html_url)
    .setDescription(`**${comment.user.login}** comentou:\n> ${truncate(comment.body, COMMENT_PREVIEW_LIMIT)}`)
    .setAuthor({ name: comment.user.login, iconURL: comment.user.avatar_url, url: comment.user.html_url })
    .setFooter({ text: repository.full_name })
    .setTimestamp();
}

/**
 * Evento `issue_comment`: também dispara para comentários em Issues comuns — aqui só
 * notificamos quando o comentário é numa Pull Request (`issue.pull_request` presente).
 */
export function buildIssueCommentEmbed(payload: IssueCommentEvent): EmbedBuilder | null {
  const { action, issue, comment, repository } = payload;

  if (action !== "created") return null;
  if (!issue.pull_request) return null;

  return buildCommentEmbed(issue.number, comment, repository);
}

export function buildPullRequestReviewCommentEmbed(
  payload: PullRequestReviewCommentEvent
): EmbedBuilder | null {
  const { action, comment, pull_request: pr, repository } = payload;

  if (action !== "created") return null;

  return buildCommentEmbed(pr.number, comment, repository);
}

const DEPLOY_STARTED_STATES = new Set(["pending", "queued", "in_progress"]);
const DEPLOY_FAILED_STATES = new Set(["failure", "error"]);

/**
 * Evento `deployment_status`, via API de Deployments do GitHub. GitHub Actions e
 * integrações como Vercel/Railway/Render podem reportar o estado de um deploy por aqui.
 */
export function buildDeploymentStatusEmbed(payload: DeploymentStatusEvent): EmbedBuilder | null {
  const { action, deployment_status: status, deployment, repository } = payload;

  if (action !== "created") return null;

  const environment = status.environment || deployment.environment;
  const commitInfo = deployment.description?.trim() || deployment.ref || deployment.sha.slice(0, 7);
  const url = status.target_url || status.log_url;

  let title: string;
  let color: number;

  if (status.state === "success") {
    title = "🚀 Deploy realizado";
    color = COLORS.green;
  } else if (DEPLOY_FAILED_STATES.has(status.state)) {
    title = "❌ Deploy falhou";
    color = COLORS.red;
  } else if (DEPLOY_STARTED_STATES.has(status.state)) {
    title = "🚀 Deploy iniciado";
    color = COLORS.blue;
  } else {
    return null;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`Environment: \`${environment}\`\nRepository: \`${repository.full_name}\``)
    .setFooter({ text: `Commit: ${commitInfo}` })
    .setTimestamp();

  if (url) embed.setURL(url);

  return embed;
}
