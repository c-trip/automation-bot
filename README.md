# Joyce Bot

Bot que recebe eventos do GitHub (via webhook) e notifica automaticamente canais do Discord sobre Pull Requests, builds e Issues. Veja [`bot.md`](./bot.md) para a visão geral completa do produto e o roadmap.

## Stack

- Node.js + TypeScript
- Fastify (HTTP)
- discord.js (Discord)
- GitHub Webhooks

## Setup

```bash
pnpm install
cp .env.example .env   # depois preencha os valores
pnpm dev
```

### Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (padrão 3333) | Porta do servidor HTTP |
| `DISCORD_TOKEN` | sim | Token do bot (Discord Developer Portal → Bot) |
| `DISCORD_CLIENT_ID` | sim | Application ID |
| `DISCORD_GUILD_ID` | não | ID do servidor (uso futuro: slash commands) |
| `DISCORD_CHANNEL_ID` | recomendado | Canal padrão, usado quando um canal específico abaixo não está definido |
| `DISCORD_CHANNEL_PRS` | não | Canal para eventos de Pull Request (`#github-prs`) |
| `DISCORD_CHANNEL_BUILDS` | não | Canal para eventos de build (`#builds`) |
| `DISCORD_CHANNEL_ISSUES` | não | Canal para eventos de issues (`#issues`) |
| `DISCORD_CHANNEL_DEPLOYS` | não | Canal para eventos de deploy (`#deploys`) |
| `GITHUB_WEBHOOK_SECRET` | sim | Secret usado para validar a assinatura do webhook do GitHub |

Para pegar o ID de um canal do Discord: ative o **Modo Desenvolvedor** (Configurações → Avançado) e clique com o botão direito no canal → **Copiar ID**.

### Configurando o webhook no GitHub

No repositório: **Settings → Webhooks → Add webhook**

- **Payload URL**: `https://SEU_DOMINIO/webhooks/github` (em desenvolvimento local, use [ngrok](https://ngrok.com) ou similar para expor `localhost:3333`)
- **Content type**: `application/json`
- **Secret**: o mesmo valor de `GITHUB_WEBHOOK_SECRET` no `.env`
- **Eventos**: selecione *Pull requests*, *Pull request reviews*, *Pull request review comments*, *Issue comments*, *Workflow runs*, *Deployment statuses* e *Issues*

## Scripts

```bash
pnpm dev            # desenvolvimento (hot reload)
pnpm build          # compila para dist/
pnpm start          # roda a versão compilada
pnpm typecheck      # checagem de tipos sem gerar build
pnpm test:webhook   # envia um payload de exemplo assinado para /webhooks/github
```

## Como testar

Veja o passo a passo completo em [`COMO-TESTAR.md`](./COMO-TESTAR.md).

## Estrutura

```txt
src/
├── server.ts               # bootstrap do Fastify + Discord
├── bot.ts                  # client do Discord (login)
├── routes/
│   └── github.ts            # POST /webhooks/github
├── services/
│   ├── discord.service.ts   # envio de mensagens/embeds
│   └── github.service.ts    # validação de assinatura + montagem de embeds
├── config/
│   └── env.ts                # leitura/validação de variáveis de ambiente
└── types/
    └── github.ts             # tipos dos payloads de webhook usados
```

## Histórico de implementações

Cada etapa de desenvolvimento é resumida em [`docs/implementacoes/`](./docs/implementacoes/) (decisões, arquivos alterados, pendências).

## Status (bot.md → Roadmap V1)

**Sprint 1**

- [x] Servidor Fastify com endpoint `/saude` e `/webhooks/github`
- [x] Bot do Discord conectando via `discord.js`
- [x] Validação de assinatura HMAC do webhook do GitHub
- [x] Envio de embeds para eventos `pull_request`, `pull_request_review`, `workflow_run` e `issues`

**Sprint 2**

- [x] PR abertas / aprovadas / mergeadas

**Sprint 3**

- [x] Workflow Actions / CI: `.github/workflows/ci.yml` (typecheck + build a cada push/PR)
- [x] Builds: notificações de build iniciada, concluída e falhada (`workflow_run`)

**Sprint 4 — Produtividade da equipa**

- [x] PR pronta para review (`pull_request` → `ready_for_review`)
- [x] Review solicitada (`pull_request` → `review_requested`)
- [x] Comentário em Pull Request (`issue_comment` e `pull_request_review_comment`)
- [x] Issue reaberta (`issues` → `reopened`)
- [x] Pull Request reaberta (`pull_request` → `reopened`, antes tratada igual a "aberta")

**Sprint 5 — Deploy**

- [x] Deploy iniciado / concluído / falhou via `deployment_status` (GitHub Actions, Vercel, Railway, Render — o que estiver integrado com a API de Deployments do GitHub)

**Pendente**

- [ ] Persistência em banco de dados
- [ ] `/stats` e `/leaderboard` (dependem de persistência)
- [ ] Lembretes automáticos (PR sem review há 24h, issue parada, build quebrando repetido)
- [ ] Slash commands
- [ ] Integrações com Jira, Linear, Notion
