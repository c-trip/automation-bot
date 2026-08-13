import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { sendEmbedToChannel } from "../services/discord.service";
import {
  buildDeploymentStatusEmbed,
  buildIssueCommentEmbed,
  buildIssueEmbed,
  buildPullRequestEmbed,
  buildPullRequestReviewCommentEmbed,
  buildPullRequestReviewEmbed,
  buildWorkflowRunEmbed,
  verifySignature,
} from "../services/github.service";
import {
  recordBuildRun,
  recordIssueEvent,
  recordPullRequestEvent,
  recordPullRequestReviewEvent,
} from "../services/stats.service";
import type {
  DeploymentStatusEvent,
  IssueCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from "../types/github";

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

export async function githubRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      (req as RawBodyRequest).rawBody = body as Buffer;
      try {
        const json = body.length ? JSON.parse(body.toString("utf8")) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  fastify.post("/webhooks/github", async (request, reply) => {
    const rawBody = (request as RawBodyRequest).rawBody;
    const signatureHeader = request.headers["x-hub-signature-256"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const githubEventHeader = request.headers["x-github-event"];
    const githubEvent = Array.isArray(githubEventHeader) ? githubEventHeader[0] : githubEventHeader;

    if (!rawBody || !verifySignature(rawBody, signature)) {
      request.log.warn("[github] Assinatura inválida ou ausente — requisição rejeitada");
      return reply.code(401).send({ error: "Assinatura inválida" });
    }

    const payload = request.body as unknown;

    switch (githubEvent) {
      case "pull_request": {
        const prPayload = payload as PullRequestEvent;
        const embed = buildPullRequestEmbed(prPayload);
        if (embed) await sendEmbedToChannel(env.discord.channels.prs, embed);
        await recordPullRequestEvent(prPayload);
        break;
      }

      case "pull_request_review": {
        const reviewPayload = payload as PullRequestReviewEvent;
        const embed = buildPullRequestReviewEmbed(reviewPayload);
        if (embed) await sendEmbedToChannel(env.discord.channels.prs, embed);
        await recordPullRequestReviewEvent(reviewPayload);
        break;
      }

      case "pull_request_review_comment": {
        const embed = buildPullRequestReviewCommentEmbed(payload as PullRequestReviewCommentEvent);
        if (embed) await sendEmbedToChannel(env.discord.channels.prs, embed);
        break;
      }

      case "issue_comment": {
        const embed = buildIssueCommentEmbed(payload as IssueCommentEvent);
        if (embed) await sendEmbedToChannel(env.discord.channels.prs, embed);
        break;
      }

      case "workflow_run": {
        const workflowPayload = payload as WorkflowRunEvent;
        const embed = buildWorkflowRunEmbed(workflowPayload);
        if (embed) await sendEmbedToChannel(env.discord.channels.builds, embed);
        await recordBuildRun(workflowPayload);
        break;
      }

      case "deployment_status": {
        const embed = buildDeploymentStatusEmbed(payload as DeploymentStatusEvent);
        if (embed) await sendEmbedToChannel(env.discord.channels.deploys, embed);
        break;
      }

      case "issues": {
        const issuePayload = payload as IssuesEvent;
        const embed = buildIssueEmbed(issuePayload);
        if (embed) await sendEmbedToChannel(env.discord.channels.issues, embed);
        await recordIssueEvent(issuePayload);
        break;
      }

      case "ping": {
        request.log.info("[github] Ping recebido — webhook configurado com sucesso");
        break;
      }

      default:
        request.log.info(`[github] Evento não tratado: ${githubEvent ?? "desconhecido"}`);
    }

    return reply.code(200).send({ ok: true });
  });
}
