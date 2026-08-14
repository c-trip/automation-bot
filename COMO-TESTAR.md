# Como testar o Joyce Bot

Guia passo a passo para verificar que o bot está funcionando: do servidor local até notificações reais chegando no Discord a partir de eventos do GitHub.

---

## 1. Preparar o `.env`

Confirme que o `.env` (não o `.env.example`) tem pelo menos:

```env
PORT=3333
DISCORD_TOKEN=<token do bot>
DISCORD_CLIENT_ID=<application id>
DISCORD_CHANNEL_ID=<id de um canal de teste>
GITHUB_WEBHOOK_SECRET=<qualquer string secreta>
```

Para testar todos os tipos de evento em canais separados, preencha também `DISCORD_CHANNEL_PRS`, `DISCORD_CHANNEL_BUILDS`, `DISCORD_CHANNEL_ISSUES` e `DISCORD_CHANNEL_DEPLOYS` (senão tudo cai no `DISCORD_CHANNEL_ID`).

Para testar `/stats` e `/leaderboard` (seção 7), preencha também `DATABASE_URL` (Postgres) — sem ela os dois comandos respondem avisando que o banco não está configurado, sem quebrar o resto do bot.

> Como pegar o ID de um canal: no Discord, ative **Modo Desenvolvedor** (Configurações → Avançado), clique com o botão direito no canal → **Copiar ID**.

Se ainda não instalou as dependências:

```bash
pnpm install
```

---

## 2. Confirmar que o bot está no servidor com permissões

No servidor do Discord, o bot deve aparecer na lista de membros (pode estar offline até o passo 3). Confira em **Configurações do servidor → Integrações** se ele tem, no mínimo:

```
View Channels
Send Messages
Embed Links
Read Message History
```

---

## 3. Subir o servidor local

```bash
pnpm dev
```

Espere aparecer no terminal:

```
[discord] Conectado como <nome-do-bot>#0000
Server listening at http://0.0.0.0:3333
```

Se o bot não ficar **online** no Discord depois disso, veja a seção [Problemas comuns](#problemas-comuns).

---

## 4. Testar se o servidor HTTP está de pé

Em outro terminal:

```bash
curl http://localhost:3333/saude
```

Esperado: `{"status":"ok"}`

---

## 5. Testar o webhook sem depender do GitHub

O jeito mais rápido de testar: existe um script pronto (`scripts/test-webhook.js`) que monta um payload de exemplo, assina com o mesmo `GITHUB_WEBHOOK_SECRET` do seu `.env` e envia para `POST /webhooks/github` — exatamente como o GitHub faria.

Com o servidor do passo 3 rodando, em outro terminal:

```bash
pnpm test:webhook pr-opened
```

Cenários disponíveis:

| Cenário | O que simula |
|---|---|
| `ping` | Evento de teste do GitHub (não gera mensagem) |
| `pr-opened` | Pull Request aberta |
| `pr-merged` | Pull Request mergeada |
| `pr-closed` | Pull Request fechada sem merge |
| `pr-reopened` | Pull Request reaberta |
| `pr-approved` | Pull Request aprovada em review |
| `pr-ready-for-review` | PR draft marcada como pronta para review |
| `pr-review-requested` | Reviewer marcado numa PR |
| `pr-comment` | Comentário novo numa PR (`issue_comment`) |
| `pr-review-comment` | Comentário numa linha do diff da PR (`pull_request_review_comment`) |
| `build-success` | Build/Action concluída com sucesso |
| `build-failed` | Build/Action falhou |
| `deploy-started` | Deploy iniciado (`deployment_status`) |
| `deploy-success` | Deploy concluído com sucesso |
| `deploy-failed` | Deploy falhou |
| `issue-opened` | Issue aberta |
| `issue-assigned` | Issue atribuída a um responsável |
| `issue-unassigned` | Issue desatribuída |
| `issue-closed` | Issue encerrada |
| `issue-reopened` | Issue reaberta |

Exemplo testando vários de uma vez:

```bash
pnpm test:webhook pr-merged
pnpm test:webhook build-failed
pnpm test:webhook issue-opened
```

Depois de cada comando:

- No terminal: deve aparecer `← Status 200: {"ok":true}`.
- No Discord: deve chegar um embed no canal configurado para aquele tipo de evento (`DISCORD_CHANNEL_PRS`, `_BUILDS`, `_ISSUES` ou `DISCORD_CHANNEL_ID`).
- Se nenhum canal estiver configurado para aquele evento, o terminal do servidor mostra um aviso (`[discord] Nenhum canal configurado...`) e nenhuma mensagem é enviada — isso é esperado, não é erro.

---

## 6. Testar com o GitHub de verdade

### 6.1. Expor o servidor local

O GitHub precisa alcançar sua máquina pela internet. Em desenvolvimento, use um túnel, por exemplo [ngrok](https://ngrok.com):

```bash
ngrok http 3333
```

Isso gera uma URL pública, algo como `https://abcd1234.ngrok-free.app`.

### 6.2. Criar o webhook no repositório

No repositório GitHub que você quer monitorar: **Settings → Webhooks → Add webhook**

- **Payload URL**: `https://SUA-URL-NGROK/webhooks/github`
- **Content type**: `application/json`
- **Secret**: o mesmo valor de `GITHUB_WEBHOOK_SECRET` do `.env`
- **Which events**: selecione *Let me select individual events* e marque:
  - Pull requests
  - Pull request reviews
  - Pull request review comments
  - Issue comments
  - Workflow runs
  - Deployment statuses
  - Issues
- Deixe **Active** marcado e clique em **Add webhook**

### 6.3. Verificar a entrega

O GitHub envia automaticamente um evento `ping` ao salvar o webhook. Na página do webhook, aba **Recent Deliveries**, confira se aparece com resposta **200**.

Depois, gere eventos reais para testar:

- Abra uma Pull Request → deve notificar
- Aprove uma review → deve notificar
- Faça merge da PR → deve notificar
- Abra/feche uma Issue → deve notificar
- Rode um workflow do GitHub Actions até concluir → deve notificar

Se algo falhar, a mesma aba **Recent Deliveries** permite clicar em **Redeliver** para reenviar o mesmo payload depois de corrigir algo, sem precisar recriar o evento no GitHub.

---

## 7. Testar os slash commands (`/stats` e `/leaderboard`)

Esses comandos leem do banco de dados (Postgres via Prisma) o histórico de PRs/Issues/Builds que o bot vai registando a cada webhook recebido. Sem `DATABASE_URL` configurada, eles respondem com um aviso e nada quebra.

### 7.1. Registar os comandos no Discord

Os slash commands precisam ser registados na API do Discord antes de aparecerem no servidor — isso só precisa ser refeito quando a lista/descrição dos comandos mudar, não a cada `pnpm dev`:

```bash
pnpm commands:register
```

- Com `DISCORD_GUILD_ID` preenchido no `.env`, o registo é só nesse servidor e aparece quase na hora — recomendado em desenvolvimento.
- Sem `DISCORD_GUILD_ID`, o registo é global e pode levar até 1h para propagar em todos os servidores.

### 7.2. Rodar os comandos

Com `pnpm dev` rodando, no seu servidor do Discord digite:

```
/stats
/stats dias:7
/leaderboard
/leaderboard dias:7
```

Esperado: o bot responde (após um breve "pensando...") com um embed de estatísticas ou o ranking de quem mais mergeou PRs no período. Se `DATABASE_URL` não estiver configurada, a resposta é o aviso de banco desativado em vez do embed.

> Dica: gere alguns eventos primeiro com `pnpm test:webhook pr-merged` (repita trocando o `login` do usuário fake no script, se quiser mais de uma pessoa no leaderboard) para ter dados para consultar.

---

## 8. Testar o Engineering Project Assistant (check-in, lembrete e relatório)

Essas três funcionalidades exigem `DATABASE_URL` configurada — sem ela, os jobs do scheduler nem arrancam (aviso `[scheduler] DATABASE_URL não configurada...` no log).

### 8.1. Preparar o `.env`

```env
DISCORD_CHECKIN_CHANNEL_ID=<id do canal #atualizacoes-diarias>
DISCORD_TEAM_ROLE_ID=<id do cargo da equipa>
DISCORD_CEO_USER_ID=<id do utilizador que recebe o relatório>
```

Pra testar rápido sem esperar 48h/24h/7 dias, ajuste também (opcional):

```env
CHECKIN_INTERVAL_HOURS=0.1
CHECKIN_REMINDER_AFTER_HOURS=0.05
WEEKLY_REPORT_INTERVAL_DAYS=0.05
SCHEDULER_POLL_MINUTES=1
```

Rode `pnpm commands:register` de novo depois de adicionar `/checkin` e `/relatorio` pela primeira vez.

### 8.2. Testar o check-in manualmente

Com `pnpm dev` rodando, no Discord:

```
/checkin
```

Esperado: o bot posta o embed "📋 Check-in de Desenvolvimento" no canal configurado e abre uma thread. Responda na thread — a mensagem deve ser gravada (confira no Prisma Studio, `pnpm db:studio`, na tabela `TeamUpdate`).

### 8.3. Testar o lembrete de 24h

Com `CHECKIN_REMINDER_AFTER_HOURS` baixo (ex.: `0.05` = 3min) e `SCHEDULER_POLL_MINUTES=1`, espere o scheduler rodar depois de criar um check-in sem responder. Esperado: aparece `🔔 @<utilizador>` na thread, só para membros do cargo `DISCORD_TEAM_ROLE_ID` que ainda não responderam.

### 8.4. Testar o relatório semanal manualmente

```
/relatorio
```

Esperado: o bot envia um DM pra `DISCORD_CEO_USER_ID` com o resumo narrativo da semana (PRs, issues, builds, participação nos check-ins e falas da equipa). Se o utilizador tiver DMs fechadas para o servidor, o Discord recusa e o log mostra o erro — sem derrubar o bot.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Bot fica offline no Discord | `DISCORD_TOKEN` errado/expirado | Gere um novo token no Discord Developer Portal → Bot → Reset Token |
| `EADDRINUSE` ao rodar `pnpm dev` | Já existe um servidor rodando na porta 3333 | Feche o outro processo, ou mude `PORT` no `.env` |
| Webhook responde `401` | Assinatura inválida — o `GITHUB_WEBHOOK_SECRET` do `.env` não é igual ao configurado no GitHub | Alinhe o secret nos dois lados |
| Webhook responde `200` mas nada chega no Discord | Canal não configurado para aquele evento, ou ID errado | Confira `DISCORD_CHANNEL_*` no `.env`; veja o aviso no log do servidor |
| Mensagem não aparece mesmo com canal certo | Bot sem permissão `Send Messages`/`View Channels` naquele canal | Ajuste as permissões do bot no canal ou no cargo dele |
| GitHub mostra erro na entrega (não 200) | URL do ngrok mudou, ou servidor local caiu | Confirme que `pnpm dev` está rodando e a URL do ngrok bate com a do webhook |
| `/stats` ou `/leaderboard` não aparecem ao digitar no Discord | Comandos ainda não foram registados, ou registo global ainda propagando | Rode `pnpm commands:register`; se não usar `DISCORD_GUILD_ID`, espere até 1h |
| `/stats`/`/leaderboard` sempre avisam que o banco não está configurado | `DATABASE_URL` ausente ou inválida no `.env` | Configure um Postgres válido em `DATABASE_URL` e rode `pnpm db:deploy` |
| Check-in automático nunca é postado | `DISCORD_CHECKIN_CHANNEL_ID` ausente, ou `DATABASE_URL` não configurada (scheduler nem arranca) | Confira o log ao subir o servidor: deve aparecer `[scheduler] Jobs ligados...` |
| Lembrete de 24h nunca chega | `DISCORD_TEAM_ROLE_ID` ou `DISCORD_GUILD_ID` ausentes, ou nenhum membro do servidor tem o cargo configurado | Confirme os IDs e que algum membro real tem o cargo |
| `/relatorio` responde mas o CEO não recebe DM | `DISCORD_CEO_USER_ID` errado, ou a pessoa tem DMs fechadas para membros do servidor | Confira o ID e as configurações de privacidade do Discord da pessoa |
