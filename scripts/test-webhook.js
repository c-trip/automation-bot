// Envia payloads de exemplo do GitHub para o webhook local, já assinados
// com o GITHUB_WEBHOOK_SECRET do .env — para testar o bot sem precisar
// de um evento real do GitHub.
//
// Uso: node scripts/test-webhook.js <cenario>
// Cenários disponíveis: ping, pr-opened, pr-merged, pr-closed, pr-approved,
//                        build-success, build-failed, issue-opened, issue-closed

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
