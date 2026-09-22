# FodyPay chat backend

The AI concierge / chat agent for **fodypay.com**, ported from the rent.wf
platform. This is a self-contained **Cloudflare Worker** that owns:

- guest chat sessions + message history (KV + D1),
- Workers AI replies (Llama 3.3 70B → 3.1 8B → 3.2 3B fallback),
- Telegram hand-off with **Forum Topics** (one topic per visitor),
- the hybrid `bot_handling` / `admin_handling` state machine,
- guest ↔ operator **auto-translation** (`m2m100-1.2b`),
- the proactive "admin away" safety-net cron sweep.

The on-site widget lives in `../src/components/ChatWidget.astro` +
`chat-logic.ts` + `chat-shell.ts`, mounted by `../src/layouts/Layout.astro`.

## Architecture vs. rent.wf

| rent.wf | fodypay.com |
|---|---|
| multi-tenant, synced from Google Sheets → D1 | **single tenant** (`fodypay`) |
| hospitality context (rooms, bookings, fleet…) | **static product knowledge** in `src/knowledge.ts` |
| `cron/cms-sync.js` mirrors Sheets → D1 | **no cron** — staff roster is seeded manually (see below) |
| ~18 D1 tables | **4 tables** (`messages`, `chat_state`, `tenant_admins`, `tenant_telegram_groups`) |

## Prerequisites

- Cloudflare account with **Workers AI** enabled on the account.
- `wrangler` CLI (`npm i -g wrangler` or use `npx wrangler`).
- A Telegram bot from [@BotFather](https://t.me/BotFather).

## One-time setup

```bash
cd worker
npm install

# 1. Create the D1 database + KV namespace, then paste the ids into wrangler.toml
npx wrangler d1 create fodypay_chat_db
npx wrangler kv namespace create CHAT_SESSIONS
#   → edit wrangler.toml: database_id and id (the two REPLACE-… placeholders)

# 2. Apply the schema
npx wrangler d1 execute fodypay_chat_db --remote --file=./schema.sql

# 3. Set secrets (never commit real values)
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put CHAT_SYNC_SECRET

# 4. Deploy
npx wrangler deploy --config wrangler.toml
```

`wrangler.toml` has a `[triggers] crons = ["* * * * *"]` entry that runs the
`admin_handling` away-sweep every minute.

## Telegram hand-off setup

1. In Telegram, create a **private group**, enable **Topics** (group settings →
   *Topics*), and add the bot as an **admin**.
2. Seed the support-staff roster so the bot can recognise you (replace the
   `telegram_chat_id` with your own numeric id — message @userinfobot to get it):

   ```bash
   curl -X POST "https://fodypay-chat-backend.<your-subdomain>.workers.dev/internal/admins/sync" \
     -H "Authorization: Bearer $CHAT_SYNC_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"tenantId":"fodypay","admins":[{"username":"you","display_name":"Your Name","role":"support","telegram_chat_id":"123456789"}]}'
   ```

3. Register the webhook (the `secret_token` must equal `TELEGRAM_WEBHOOK_SECRET`):

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://fodypay-chat-backend.<your-subdomain>.workers.dev/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

4. In the group, type **`/setup`**. The bot links the group to the `fodypay`
   tenant and shows the auto-translate toggle.

### Operator commands (inside a visitor's topic)

| Command | Effect |
|---|---|
| *(any normal reply)* | Takes over the conversation (`admin_handling`) — freezes the AI |
| `.bot` | Hands control back to the AI |
| `.done` | Closes politely + resumes the AI |
| `/translate` | Re-shows the auto-translate toggle |
| `/setlang <code>` | Sets the language visitor messages are translated into (`en/de/ru/uk/es/it/fr/pl`) |

A 10-minute operator timeout (`ADMIN_AWAY_TIMEOUT_MS`) auto-resumes the AI with
a short heads-up, both lazily on the visitor's next message and proactively via
the cron sweep.

## Wiring the on-site widget

The widget posts to the Worker at the origin set in
`../src/components/chat-logic.ts` (`WORKER_URL`). It defaults to
`https://fodypay-chat-backend.dmitry-cd0.workers.dev`; override at build time
with the `PUBLIC_CHAT_BACKEND_URL` env var if the Worker is on a custom domain:

```bash
PUBLIC_CHAT_BACKEND_URL=https://chat.fodypay.com npm run build
```

## Editing the AI's knowledge

The facts the AI is grounded on live in [`src/knowledge.ts`](./src/knowledge.ts)
(`FODYPAY_CONTEXT`). Update that file and re-deploy whenever product copy,
pricing, or availability changes — the AI is forbidden from inventing anything
not in that block.

## Secrets reference

| Secret | Where | Used by |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `wrangler secret` | Telegram API calls |
| `TELEGRAM_WEBHOOK_SECRET` | `wrangler secret` + `setWebhook` | `/telegram/webhook` auth |
| `CHAT_SYNC_SECRET` | `wrangler secret` | `/internal/*` endpoints |
| `PUBLIC_CHAT_BACKEND_URL` | build-time env (site) | widget's `WORKER_URL` |

None of these are committed to `wrangler.toml` as plain values.
