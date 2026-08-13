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

Para testar todos os tipos de evento em canais separados, preencha também `DISCORD_CHANNEL_PRS`, `DISCORD_CHANNEL_BUILDS` e `DISCORD_CHANNEL_ISSUES` (senão tudo cai no `DISCORD_CHANNEL_ID`).

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
curl http://localhost:3333/health
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
| `pr-approved` | Pull Request aprovada em review |
| `build-success` | Build/Action concluída com sucesso |
| `build-failed` | Build/Action falhou |
| `issue-opened` | Issue aberta |
| `issue-closed` | Issue encerrada |

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
  - Workflow runs
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

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Bot fica offline no Discord | `DISCORD_TOKEN` errado/expirado | Gere um novo token no Discord Developer Portal → Bot → Reset Token |
| `EADDRINUSE` ao rodar `pnpm dev` | Já existe um servidor rodando na porta 3333 | Feche o outro processo, ou mude `PORT` no `.env` |
| Webhook responde `401` | Assinatura inválida — o `GITHUB_WEBHOOK_SECRET` do `.env` não é igual ao configurado no GitHub | Alinhe o secret nos dois lados |
| Webhook responde `200` mas nada chega no Discord | Canal não configurado para aquele evento, ou ID errado | Confira `DISCORD_CHANNEL_*` no `.env`; veja o aviso no log do servidor |
| Mensagem não aparece mesmo com canal certo | Bot sem permissão `Send Messages`/`View Channels` naquele canal | Ajuste as permissões do bot no canal ou no cargo dele |
| GitHub mostra erro na entrega (não 200) | URL do ngrok mudou, ou servidor local caiu | Confirme que `pnpm dev` está rodando e a URL do ngrok bate com a do webhook |
