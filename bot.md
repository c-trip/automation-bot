# Joyce Bot

## Visão Geral

O **Joyce Bot** será o núcleo da plataforma de automação para equipes de desenvolvimento.

Sua primeira responsabilidade será receber eventos do GitHub e notificar automaticamente os canais do Discord sobre:

* Pull Requests abertas
* Pull Requests aprovadas
* Pull Requests mergeadas
* Builds concluídas
* Builds falhadas
* Novas Issues
* Issues encerradas

No futuro, ele poderá evoluir para:

* Daily Standups Automáticas
* Deploys via Discord
* Dashboard de Métricas
* Relatórios Semanais
* Revisão de Código com IA
* Integração com Jira, Notion e Linear

---

# Nome do Bot

## Nome Principal

**Joyce**

### Username

```txt
joyce
```

### Nome de Exibição

```txt
joyce
```

---

# Identidade do Produto

## Slogan

```txt
Automating Development Teams
```

ou

```txt
Your team's development assistant
```

ou

```txt
Where GitHub meets Discord
```

---

# Stack Tecnológica

## Backend

```txt
Node.js
TypeScript
```

## Framework HTTP

```txt
Fastify
```

## Discord

```txt
Discord.js
```

## GitHub

```txt
GitHub Webhooks
```

## Banco de Dados (Futuro)

```txt
PostgreSQL
Prisma
```

## Hospedagem

```txt
Railway
Render
VPS
```

---

# Estrutura Inicial do Projeto

```txt
joyce-bot/

├── src
│   ├── server.ts
│   ├── bot.ts
│   │
│   ├── routes
│   │   └── github.ts
│   │
│   ├── services
│   │   ├── discord.service.ts
│   │   └── github.service.ts
│   │
│   ├── config
│   │   └── env.ts
│   │
│   └── types
│       └── github.ts
│
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

# Criando o Bot no Discord

## Passo 1

Acesse:

```txt
https://discord.com/developers/applications
```

---

## Passo 2

Clique em:

```txt
New Application
```

---

## Passo 3

Nome da aplicação:

```txt
Joyce
```

---

## Passo 4

Abra:

```txt
Bot
```

---

## Passo 5

Clique em:

```txt
Add Bot
```

---

## Passo 6

Ative:

```txt
MESSAGE CONTENT INTENT
```

```txt
SERVER MEMBERS INTENT
```

```txt
PRESENCE INTENT
```

---

## Passo 7

Copie o Token

Exemplo:

```txt
DISCORD_TOKEN=xxxxxxxxxxxxxxxx
```

Nunca publique este token.

---

# Permissões Necessárias

O bot precisa de:

```txt
View Channels
Send Messages
Embed Links
Read Message History
Use Slash Commands
```

---

# Convidando o Bot

Em:

```txt
OAuth2
```

Selecione:

```txt
bot
applications.commands
```

Permissões:

```txt
Send Messages
View Channels
Embed Links
```

Gere a URL e adicione o bot ao servidor.

---

# Variáveis de Ambiente

Arquivo:

```txt
.env
```

Conteúdo:

```env
PORT=3333

DISCORD_TOKEN=

DISCORD_CLIENT_ID=

GITHUB_WEBHOOK_SECRET=
```

---

# Eventos do GitHub para o MVP

## Pull Request

```txt
pull_request
```

Eventos:

```txt
opened
closed
reopened
```

---

## Reviews

```txt
pull_request_review
```

---

## Workflow

```txt
workflow_run
```

---

## Issues

```txt
issues
```

---

# Canais Recomendados

## Desenvolvimento

```txt
#github-prs
```

Recebe:

* Novas PRs
* Aprovações
* Merges

---

## Builds

```txt
#builds
```

Recebe:

* Build iniciada
* Build concluída
* Build falhada

---

## Bugs

```txt
#issues
```

Recebe:

* Novas Issues
* Issues encerradas

---

# Primeiro MVP

## Objetivo

Receber um evento GitHub e enviar uma mensagem ao Discord.

Fluxo:

```txt
GitHub
    │
    ▼
Webhook
    │
    ▼
Joyce API
    │
    ▼
Discord Bot
    │
    ▼
Canal Discord
```

---

# Roadmap V1

## Sprint 1

* Criar bot
* Conectar Discord
* Receber webhook GitHub
* Enviar mensagens

---

## Sprint 2

* PR abertas
* PR aprovadas
* PR mergeadas

---

## Sprint 3

* Workflow Actions
* Builds
* Deploys

---

## Sprint 4

* Banco de dados
* Histórico de eventos

---

## Sprint 5

* Dashboard Web
* Métricas de produtividade

---

## Sprint 6

* IA para revisão de código
* Relatórios automáticos
* Daily standups automáticas

---

# Objetivo Final

Transformar o Joyce em uma plataforma completa de Developer Operations (DevOps + Team Productivity), centralizando GitHub, Discord, CI/CD, Métricas e Inteligência Artificial em um único lugar.
