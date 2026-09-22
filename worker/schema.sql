-- FodyPay chat backend schema (Cloudflare D1).
--
-- Single-tenant: FodyPay is one product (tenant id "fodypay"), so the
-- multi-tenant context/rooms/bookings/fleet tables from rent.wf are not needed
-- here — the product knowledge is bundled statically in src/knowledge.ts.
-- Only the chat/session machinery and the Telegram hand-off routing are kept.

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    sender TEXT NOT NULL,
    sender_name TEXT,        -- display label for 'bot' (tenant name) / 'admin' (operator display_name)
    message TEXT NOT NULL,
    original_message TEXT,   -- the admin's untranslated reply when auto-translate is ON (so the guest can "See original")
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

-- Per-session chat routing state (bot_handling / admin_handling). Mirrored from
-- KV (chat_state:<sessionId>) so the scheduled "admin away" sweep can enumerate
-- stale admin_handling sessions (KV has no list-with-filter). KV remains the
-- fast per-message read; this table is the enumeration index.
CREATE TABLE IF NOT EXISTS chat_state (
    session_id TEXT PRIMARY KEY,
    state      TEXT NOT NULL,
    admin_name TEXT,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_state_state ON chat_state(state);

-- Support-staff roster, keyed by their personal Telegram chat id. Mirrored here
-- via POST /internal/admins/sync (bearer CHAT_SYNC_SECRET). Used only to route
-- guest chats to the right operator over Telegram and to resolve the operator's
-- display name — not a login/auth table.
CREATE TABLE IF NOT EXISTS tenant_admins (
    tenant_id        TEXT NOT NULL,
    username         TEXT NOT NULL,
    display_name     TEXT,
    role             TEXT,
    telegram_chat_id TEXT,
    synced_at        INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, username)
);

-- The private Telegram group (Forum Topics enabled) that hosts FodyPay's
-- support threads. Set once via POST /internal/telegram-group (or /setup in the
-- group). Each guest session gets its own topic inside this group.
CREATE TABLE IF NOT EXISTS tenant_telegram_groups (
    tenant_id      TEXT NOT NULL,
    group_chat_id  TEXT NOT NULL,
    telegram_lang  TEXT NOT NULL DEFAULT 'en',  -- admin's preferred reading language (m2m100 code)
    auto_translate INTEGER NOT NULL DEFAULT 0,  -- 1 = auto-translate admin replies into the guest's language
    created_at     INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, group_chat_id)
);
