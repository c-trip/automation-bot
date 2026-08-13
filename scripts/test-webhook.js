// Envia payloads de exemplo do GitHub para o webhook local, já assinados
// com o GITHUB_WEBHOOK_SECRET do .env — para testar o bot sem precisar
// de um evento real do GitHub.
//
// Uso: node scripts/test-webhook.js <cenario>
// Cenários disponíveis: ping, pr-opened, pr-merged, pr-closed, pr-approved,
//                        pr-reopened, pr-ready-for-review, pr-review-requested,
//                        pr-comment, pr-review-comment,
//                        build-success, build-failed,
//                        deploy-started, deploy-success, deploy-failed,
//                        issue-opened, issue-assigned, issue-unassigned,
//                        issue-closed, issue-reopened

require("dotenv/config");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3333;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

if (!SECRET) {
  console.error("❌ GITHUB_WEBHOOK_SECRET não está definido no .env");
  process.exit(1);
}

const user = {
  login: "helder",
  html_url: "https://github.com/helder",
  avatar_url: "https://github.com/helder.png",
};

const assignee = {
  login: "maria",
  html_url: "https://github.com/maria",
  avatar_url: "https://github.com/maria.png",
};

const carlos = {
  login: "carlos",
  html_url: "https://github.com/carlos",
  avatar_url: "https://github.com/carlos.png",
};

const ana = {
  login: "ana",
  html_url: "https://github.com/ana",
  avatar_url: "https://github.com/ana.png",
};

const repository = {
  full_name: "helder/joyce-bot",
  html_url: "https://github.com/helder/joyce-bot",
};

const basePR = {
  number: 42,
  title: "Corrige bug no login",
  html_url: "https://github.com/helder/joyce-bot/pull/42",
  user,
  merged: false,
  draft: false,
  base: { ref: "main" },
  head: { ref: "fix/login" },
};

const scenarios = {
  ping: {
    event: "ping",
    payload: { zen: "Non-blocking is better than blocking.", repository },
  },
  "pr-opened": {
    event: "pull_request",
    payload: { action: "opened", pull_request: basePR, repository, sender: user },
  },
  "pr-merged": {
    event: "pull_request",
    payload: {
      action: "closed",
      pull_request: { ...basePR, merged: true },
      repository,
      sender: user,
    },
  },
  "pr-closed": {
    event: "pull_request",
    payload: {
      action: "closed",
      pull_request: { ...basePR, merged: false },
      repository,
      sender: user,
    },
  },
  "pr-approved": {
    event: "pull_request_review",
    payload: {
      action: "submitted",
      review: {
        state: "approved",
        html_url: "https://github.com/helder/joyce-bot/pull/42#pullrequestreview-1",
        user,
      },
      pull_request: basePR,
      repository,
    },
  },
  "pr-reopened": {
    event: "pull_request",
    payload: { action: "reopened", pull_request: basePR, repository, sender: user },
  },
  "pr-ready-for-review": {
    event: "pull_request",
    payload: {
      action: "ready_for_review",
      pull_request: { ...basePR, draft: false, requested_reviewers: [carlos, ana] },
      repository,
      sender: user,
    },
  },
  "pr-review-requested": {
    event: "pull_request",
    payload: {
      action: "review_requested",
      pull_request: basePR,
      requested_reviewer: carlos,
      repository,
      sender: user,
    },
  },
  "pr-comment": {
    event: "issue_comment",
    payload: {
      action: "created",
      issue: {
        number: basePR.number,
        title: basePR.title,
        html_url: basePR.html_url,
        user,
        pull_request: { html_url: basePR.html_url },
      },
      comment: {
        body: "Precisamos tratar este edge case.",
        html_url: `${basePR.html_url}#issuecomment-1`,
        user: carlos,
      },
      repository,
    },
  },
  "pr-review-comment": {
    event: "pull_request_review_comment",
    payload: {
      action: "created",
      comment: {
        body: "Esta linha pode gerar null pointer se `user` vier undefined.",
        html_url: `${basePR.html_url}#discussion_r1`,
        user: carlos,
      },
      pull_request: basePR,
      repository,
    },
  },
  "build-success": {
    event: "workflow_run",
    payload: {
      action: "completed",
      workflow_run: {
        name: "CI",
        html_url: "https://github.com/helder/joyce-bot/actions/runs/123",
        conclusion: "success",
        status: "completed",
        head_branch: "main",
        run_number: 17,
      },
      repository,
      sender: user,
    },
  },
  "build-failed": {
    event: "workflow_run",
    payload: {
      action: "completed",
      workflow_run: {
        name: "CI",
        html_url: "https://github.com/helder/joyce-bot/actions/runs/124",
        conclusion: "failure",
        status: "completed",
        head_branch: "fix/login",
        run_number: 18,
      },
      repository,
      sender: user,
    },
  },
  "deploy-started": {
    event: "deployment_status",
    payload: {
      action: "created",
      deployment_status: {
        state: "in_progress",
        environment: "production",
        target_url: "https://vercel.com/helder/joyce-bot/deployments/1",
      },
      deployment: {
        sha: "a1b2c3d4e5f6",
        ref: "main",
        environment: "production",
        description: "feat(auth): add oauth login",
      },
      repository,
      sender: user,
    },
  },
  "deploy-success": {
    event: "deployment_status",
    payload: {
      action: "created",
      deployment_status: {
        state: "success",
        environment: "production",
        target_url: "https://frontend.example.com",
      },
      deployment: {
        sha: "a1b2c3d4e5f6",
        ref: "main",
        environment: "production",
        description: "feat(auth): add oauth login",
      },
      repository,
      sender: user,
    },
  },
  "deploy-failed": {
    event: "deployment_status",
    payload: {
      action: "created",
      deployment_status: {
        state: "failure",
        environment: "production",
        log_url: "https://vercel.com/helder/joyce-bot/deployments/1/logs",
      },
      deployment: {
        sha: "a1b2c3d4e5f6",
        ref: "main",
        environment: "production",
        description: "feat(auth): add oauth login",
      },
      repository,
      sender: user,
    },
  },
  "issue-opened": {
    event: "issues",
    payload: {
      action: "opened",
      issue: {
        number: 7,
        title: "Botão de login não responde",
        html_url: "https://github.com/helder/joyce-bot/issues/7",
        user,
      },
      repository,
      sender: user,
    },
  },
  "issue-assigned": {
    event: "issues",
    payload: {
      action: "assigned",
      issue: {
        number: 7,
        title: "Botão de login não responde",
        html_url: "https://github.com/helder/joyce-bot/issues/7",
        user,
        assignee,
        assignees: [assignee],
      },
      repository,
      sender: user,
    },
  },
  "issue-unassigned": {
    event: "issues",
    payload: {
      action: "unassigned",
      issue: {
        number: 7,
        title: "Botão de login não responde",
        html_url: "https://github.com/helder/joyce-bot/issues/7",
        user,
        assignee: null,
        assignees: [],
      },
      repository,
      sender: user,
    },
  },
  "issue-closed": {
    event: "issues",
    payload: {
      action: "closed",
      issue: {
        number: 7,
        title: "Botão de login não responde",
        html_url: "https://github.com/helder/joyce-bot/issues/7",
        user,
      },
      repository,
      sender: user,
    },
  },
  "issue-reopened": {
    event: "issues",
    payload: {
      action: "reopened",
      issue: {
        number: 7,
        title: "Botão de login não responde",
        html_url: "https://github.com/helder/joyce-bot/issues/7",
        user,
      },
      repository,
      sender: user,
    },
  },
};

const scenarioName = process.argv[2] || "pr-opened";
const chosen = scenarios[scenarioName];

if (!chosen) {
  console.error(`❌ Cenário desconhecido: "${scenarioName}"`);
  console.error(`   Disponíveis: ${Object.keys(scenarios).join(", ")}`);
  process.exit(1);
}

const body = JSON.stringify(chosen.payload);
const signature = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");

async function main() {
  console.log(`→ Enviando cenário "${scenarioName}" (evento "${chosen.event}") para http://localhost:${PORT}/webhooks/github ...`);

  const res = await fetch(`http://localhost:${PORT}/webhooks/github`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": chosen.event,
      "x-github-delivery": crypto.randomUUID(),
      "x-hub-signature-256": signature,
    },
    body,
  });

  const text = await res.text();
  console.log(`← Status ${res.status}: ${text}`);
}

main().catch((err) => {
  console.error("❌ Erro ao enviar requisição (o servidor está rodando com `pnpm dev`?):", err.message);
  process.exit(1);
});
