import { createHmac, timingSafeEqual } from "node:crypto";
import { EmbedBuilder } from "discord.js";
import { env } from "../config/env";
import type {
  IssuesEvent,
  PullRequestEvent,
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

  if (action === "opened" || action === "reopened") {
    return new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle(`🔀 PR #${pr.number} aberta: ${pr.title}`)
      .setURL(pr.html_url)
      .setDescription(`\`${pr.head.ref}\` → \`${pr.base.ref}\``)
      .setAuthor({ name: pr.user.login, iconURL: pr.user.avatar_url, url: pr.user.html_url })
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

  return null;
}
