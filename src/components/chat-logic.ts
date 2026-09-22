import { CHAT_SHELL_HTML, MAX_INPUT_HEIGHT_PX } from "./chat-shell";

const WORKER_URL: string =
  (import.meta as any).env?.PUBLIC_CHAT_BACKEND_URL ||
  "https://fodypay-chat-backend.dmitry-cd0.workers.dev";

// Transport-only marker the landing page's intake wizard prepends to its
// composed quiz summary (see Landing.astro). The worker strips it server-side
// before storing/forwarding and uses it only to flag the intake to the sales
// AI. Strip it here too so the guest's optimistic bubble never shows the raw
// marker, and so the dedup queue matches the server's stored (clean) text -
// otherwise the next poll would render the same message a second time.
const INTAKE_SUBMISSION_MARKER = "[[INTAKE_SUBMISSION]]";

let audioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  try {
    // Prefer the context already unlocked by ChatWidget.astro's eager inline
    // script (window.__fodypayAudioCtx) so the notification sound works on the
    // landing page's intake flow, where chat-logic is lazy-loaded only after
    // the user's gesture (its own unlock listener below registers too late).
    const eager = (window as any).__fodypayAudioCtx as AudioContext | undefined;
    if (eager) {
      audioCtx = eager;
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

// Browsers suspend audio until a user gesture happens anywhere on the page;
// prime the context on the first one so a later notification isn't silently dropped.
if (typeof document !== "undefined") {
  const unlockAudio = () => ensureAudioContext();
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}

// Short synthesized two-tone chime - avoids shipping/loading an audio asset.
const SOUND_COOLDOWN_MS = 3000;
const LAST_SOUND_KEY = "fodypay_last_sound_at";
let lastNotificationSoundAt = 0;
function playNotificationSound() {
  const now = Date.now();
  // Cooldown shared across tabs via localStorage: every open tab runs its own
  // poll loop, and without this each tab would chime for the same reply. Only
  // the first tab within the cooldown window actually plays.
  if (now - lastNotificationSoundAt < SOUND_COOLDOWN_MS) return;
  try {
    const lastShared = Number(localStorage.getItem(LAST_SOUND_KEY) || 0);
    if (now - lastShared < SOUND_COOLDOWN_MS) return;
    localStorage.setItem(LAST_SOUND_KEY, String(now));
  } catch {
    // localStorage can throw in private/blocked contexts - the in-memory flag
    // above still prevents bursts within this tab.
  }
  lastNotificationSoundAt = now;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (e) {
    console.error("Failed to play chat notification sound:", e);
  }
}

// Technical-looking, platform-independent avatars for bot/admin message
// labels (see buildBubbleWrapper) - deliberately plain stroke icons, not
// emoji, so they render identically everywhere instead of at the mercy of
// each OS's own emoji font.
const ROBOT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3" /><rect x="5" y="8" width="14" height="11" rx="2" /><circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" /><path d="M9 16.5h6" /><path d="M3 12h2" /><path d="M19 12h2" /></svg>`;
const USER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>`;

export interface ChatStrings {
  title: string;
  greeting: string;
  placeholder: string;
  send: string;
  closeLabel: string;
  today: string;
  yesterday: string;
  aiLabel: string;
  hostLabel: string;
  newMessages: string;
  seeOriginal: string;
  seeTranslation: string;
}

const defaultStrings: ChatStrings = {
  title: "Support chat",
  greeting: "Hi! How can I help you?",
  placeholder: "Type a message...",
  send: "Send",
  closeLabel: "Close chat",
  today: "Today",
  yesterday: "Yesterday",
  aiLabel: "AI",
  hostLabel: "Host",
  newMessages: "New messages",
  seeOriginal: "See original",
  seeTranslation: "See translation",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "'");
}

// Minimal, dependency-free Markdown -> HTML: everything is HTML-escaped
// FIRST, then only ever re-wrapped in a small fixed set of tags we control
// (strong/em/code/a/br) - so there's no path for a message's own text to
// introduce arbitrary markup, even without a sanitizer library. Link targets
// are restricted to http(s) for the same reason (no javascript: hrefs).
function renderMarkdown(raw: string): string {
  let html = escapeHtml(raw);

  const codeSpans: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(
      `<code style="background: rgba(127,127,127,0.18); padding: 0 0.3rem; border-radius: 0.25rem; font-size: 0.85em;">${code}</code>`
    );
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: inherit;">$1</a>'
    )
    // Auto-link bare URLs (after the explicit [text](url) form so we never
    // double-wrap; the (^|[\s(]) prefix also keeps URLs already inside
    // href="..." from matching again). Text is already HTML-escaped, so only
    // http(s) targets are ever produced - no javascript: hrefs.
    .replace(
      /(^|[\s(])((?:https?:\/\/)[^\s<>"'()]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: inherit;">$2</a>'
    )
    .replace(/\n/g, "<br>");

  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => codeSpans[Number(i)]);
}

// Bubble text is rendered via the safe renderMarkdown() above, never raw
// innerHTML - see its own comment for why that's still XSS-safe.
function buildBubbleWrapper(text: string, sender: "bot" | "user" | "admin", createdAt: number | undefined, senderName: string | null | undefined, strings: ChatStrings, originalMessage?: string | null): HTMLElement {
  const isUser = sender === "user";

  // Wraps the label row + bubble + timestamp so all three align to the same
  // side - the bubble alone can't also anchor a caption above/below it via
  // align-self.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display: flex; flex-direction: column; max-width: 80%; align-self: ${isUser ? "flex-end" : "flex-start"};`;
  // Tag each real message with its server timestamp so the read-state logic
  // can find the first unread bubble on reopen (see scrollToFirstUnread).
  if (createdAt) wrapper.dataset.createdAt = String(createdAt);

  if (!isUser) {
    // Icon + short label above bot/admin bubbles (item 3/4 of the request:
    // a robot for the AI, a person for a human operator) - the guest's own
    // messages need neither, they're already anchored to the right. Plain
    // SVGs (not emoji) so the icon looks the same everywhere - emoji glyphs
    // render wildly differently per OS/font (e.g. macOS's ?? reads as a
    // rounded "apple-ish" blob at this size, and ?? as a plain smiley).
    const label = document.createElement("div");
    label.style.cssText = "display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; opacity: 0.7; margin: 0 0.25rem 0.15rem; color: var(--color-pill-text, #6b7280);";
    const icon = document.createElement("span");
    icon.innerHTML = sender === "bot" ? ROBOT_ICON_SVG : USER_ICON_SVG;
    icon.setAttribute("aria-hidden", "true");
    icon.style.cssText = "display: inline-flex; line-height: 1;";
    const name = document.createElement("span");
    name.textContent = senderName || (sender === "bot" ? strings.aiLabel : strings.hostLabel);
    label.append(icon, name);
    wrapper.appendChild(label);
  }

  const bubble = document.createElement("div");
  bubble.innerHTML = renderMarkdown(text);
  bubble.style.cssText = isUser
    ? "background: rgba(var(--primary-rgb, 37, 99, 235), 0.15); padding: 0.5rem 0.75rem; border-radius: 0.5rem; text-align: left; line-height: 1.4; color: var(--color-text, #1f2937); overflow-wrap: break-word;"
    : "background: var(--color-pill-bg, #f3f4f6); padding: 0.5rem 0.75rem; border-radius: 0.5rem; line-height: 1.4; color: var(--color-pill-text, #374151); overflow-wrap: break-word;";
  wrapper.appendChild(bubble);

  // Guest-side "See original" toggle for translated admin replies - the mirror
  // of the admin-side "See original"/"See translation" buttons in Telegram.
  // Only rendered when the server stored the admin's untranslated text
  // alongside the translated one (original_message).
  if (originalMessage && originalMessage.trim() && originalMessage !== text) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    let showingOriginal = false;
    const renderToggle = () => {
      toggle.textContent = showingOriginal ? strings.seeTranslation : strings.seeOriginal;
    };
    renderToggle();
    toggle.style.cssText = "align-self: flex-start; background: none; border: none; color: var(--color-primary, #2563eb); font-size: 0.72rem; cursor: pointer; padding: 0.1rem 0.25rem; opacity: 0.85; text-decoration: underline; margin-top: 0.2rem;";
    toggle.addEventListener("click", () => {
      showingOriginal = !showingOriginal;
      bubble.innerHTML = renderMarkdown(showingOriginal ? originalMessage : text);
      renderToggle();
    });
    wrapper.appendChild(toggle);
  }

  if (createdAt) {
    const time = document.createElement("span");
    time.textContent = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    time.style.cssText = `font-size: 0.6875rem; color: var(--color-pill-text, #9ca3af); opacity: 0.6; margin: 0.15rem 0.25rem 0; text-align: ${isUser ? "right" : "left"};`;
    wrapper.appendChild(time);
  }

  return wrapper;
}

function buildDateSeparator(label: string): HTMLElement {
  const el = document.createElement("div");
  el.textContent = label;
  el.style.cssText = "align-self: center; font-size: 0.75rem; color: var(--color-pill-text, #6b7280); opacity: 0.75; margin: 0.4rem 0; padding: 0.15rem 0.6rem; background: var(--color-pill-bg, #f3f4f6); border-radius: 9999px;";
  return el;
}

// Full-width accent divider marking where previously-unread messages begin.
function buildUnreadDivider(label: string): HTMLElement {
  const el = document.createElement("div");
  el.textContent = label;
  el.className = "chat-unread-divider";
  el.style.cssText = "align-self: stretch; text-align: center; font-size: 0.72rem; font-weight: 700; color: var(--color-primary, #2563eb); margin: 0.4rem 0; padding: 0.28rem 0.6rem; background: rgba(var(--primary-rgb, 37, 99, 235), 0.12); border-top: 1px solid rgba(var(--primary-rgb, 37, 99, 235), 0.25); border-bottom: 1px solid rgba(var(--primary-rgb, 37, 99, 235), 0.25);";
  return el;
}

// YYYY-MM-DD in the viewer's local timezone - used purely to detect a day
// boundary between two messages, never sent to the server.
function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(timestamp: number, strings: ChatStrings): string {
  const d = new Date(timestamp);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return strings.today;
  if (diffDays === 1) return strings.yesterday;
  return d.toLocaleDateString(undefined, diffDays > 350 ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
}

interface ChatMessage {
  sender: "user" | "admin" | "bot";
  message: string;
  original_message?: string | null;
  sender_name?: string | null;
  created_at: number;
}

// Grows the textarea with its content up to a cap, past which it scrolls
// internally instead of pushing the whole widget off-screen. (The cap itself
// lives in chat-shell.ts, shared with the eagerly-rendered shell.)
function autoResizeInput(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
}

/** Handle returned by mountChat() so callers (e.g. the landing page's intake
 *  wizard, or ChatWidget's exposed window.fodypayChat API) can drive the
 *  already-mounted widget instead of re-implementing its send path. */
export interface ChatHandle {
  /** Sends `text` as the guest and renders it immediately - the same path a
   *  typed message takes, so it POSTs to /api/messages and routes to the
   *  tenant's Telegram admin(s) exactly like a manual send. */
  sendUserMessage: (text: string) => Promise<void>;
  /** Scrolls the messages pane to the FIRST new message since the visitor's
   *  last read position (inserting a "New messages" divider), or to the latest
   *  message when nothing is unread. Used when the panel is (re)opened. */
  scrollToFirstUnread: () => void;
}

export async function mountChat(
  container: HTMLElement,
  triggerBtn: HTMLElement,
  strings: ChatStrings = defaultStrings,
  tenantId?: string,
  tenantName?: string,
  onClose?: () => void
): Promise<ChatHandle> {
  // A single global key would leak one tenant's conversation into another
  // (the widget is rendered on many tenant sites + the landing page, all
  // sharing the browser's localStorage origin). Scope the persisted session
  // id by tenant so each property's chat is fully isolated.
  const sessionStorageKey = `chat_session_id:${tenantId ?? "unknown"}`;
  let sessionId = localStorage.getItem(sessionStorageKey);

  // The shell is rendered eagerly by ChatWidget.astro before this lazy chunk
  // loads (see chat-shell.ts). The guard is only a safety net for a future
  // non-eager mount path; normally #chat-panel already exists and we just
  // query the elements below.
  if (!document.getElementById("chat-panel")) container.innerHTML = CHAT_SHELL_HTML;

  const input = document.getElementById("chat-input") as HTMLTextAreaElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const closeBtn = document.getElementById("close-chat-btn") as HTMLButtonElement;
  const titleLabel = document.getElementById("chat-title-label");
  const messagesContainer = document.getElementById("chat-messages") as HTMLElement;
  const panel = document.getElementById("chat-panel") as HTMLElement;
  const resizeGrip = document.getElementById("chat-resize-grip") as HTMLElement;
  const header = document.getElementById("chat-header") as HTMLElement | null;

  // Custom drag-resize (see the grip's own comment in the template above for
  // why native CSS `resize: both` is the wrong direction here). Dragging
  // toward the top-left grows the panel; toward the bottom-right shrinks it.
  resizeGrip.addEventListener("pointerdown", (e: PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panel.getBoundingClientRect().width;
    const startHeight = panel.getBoundingClientRect().height;
    const minWidth = 280;
    const minHeight = 320;
    const maxWidth = Math.min(window.innerWidth * 0.9, 480);
    const maxHeight = Math.min(window.innerHeight * 0.85, 640);
    resizeGrip.setPointerCapture(e.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const width = Math.min(maxWidth, Math.max(minWidth, startWidth + (startX - moveEvent.clientX)));
      const height = Math.min(maxHeight, Math.max(minHeight, startHeight + (startY - moveEvent.clientY)));
      panel.style.width = `${width}px`;
      panel.style.height = `${height}px`;
    };
    const onUp = (upEvent: PointerEvent) => {
      resizeGrip.releasePointerCapture(upEvent.pointerId);
      resizeGrip.removeEventListener("pointermove", onMove);
      resizeGrip.removeEventListener("pointerup", onUp);
    };
    resizeGrip.addEventListener("pointermove", onMove);
    resizeGrip.addEventListener("pointerup", onUp);
  });

  if (titleLabel) titleLabel.textContent = strings.title;
  closeBtn.setAttribute("aria-label", strings.closeLabel);
  input.placeholder = strings.placeholder;

  // Pagination/day-separator state - deliberately NOT message counts (see
  // the old renderedCount approach this replaced): with a session's history
  // now fetched a page at a time (HISTORY_PAGE_SIZE), the client tracks the
  // oldest/newest timestamps it has actually rendered instead.
  const HISTORY_PAGE_SIZE = 100;
  let oldestLoadedAt: number | null = null;
  let newestLoadedAt: number | null = null;
  let hasMoreOlder = false;
  let isLoadingOlder = false;
  let topDayKey: string | null = null; // calendar day of the topmost rendered message
  let bottomDayKey: string | null = null; // calendar day of the bottommost rendered message

  // Guest messages are rendered instantly (optimistically) with a
  // CLIENT-side timestamp for zero-latency feedback - but the server
  // assigns its own (slightly later) created_at on insert, so the very next
  // poll's `after=<that client timestamp>` legitimately matches that same
  // row again and re-fetches it. This queue lets appendMessages() recognize
  // "I already rendered this exact guest text" and reconcile the cursors
  // without inserting a second, duplicate bubble.
  const pendingUserMessages: string[] = [];
  let isSending = false; // guards sendMessage() against firing twice for one action

  // Read-state helpers: `lastReadAt` is persisted per session so reopening the
  // panel can jump to the first NEW message (with a divider) instead of the
  // very bottom, while still marking everything as read once it's shown.
  // Scoped by tenant too (same leak-prevention rationale as sessionStorageKey).
  const readStateKey = () =>
    sessionId ? `fodypay_chat_read:${tenantId ?? "unknown"}:${sessionId}` : null;
  const getLastReadAt = (): number => {
    const key = readStateKey();
    if (!key) return 0;
    const raw = localStorage.getItem(key);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  };
  const persistLastReadAt = (at: number) => {
    const key = readStateKey();
    if (key) localStorage.setItem(key, String(at));
  };

  const markAllRead = () => {
    if (newestLoadedAt !== null) persistLastReadAt(newestLoadedAt);
  };

  const scrollToFirstUnread = () => {
    // Remove any leftover divider from a previous open.
    messagesContainer.querySelectorAll(".chat-unread-divider").forEach((el) => el.remove());

    const lastReadAt = getLastReadAt();
    let target: HTMLElement | null = null;
    if (lastReadAt > 0 && newestLoadedAt !== null && newestLoadedAt > lastReadAt) {
      for (const child of Array.from(messagesContainer.children) as HTMLElement[]) {
        const ts = Number(child.dataset.createdAt);
        if (ts && ts > lastReadAt) {
          target = child;
          break;
        }
      }
    }

    if (target) {
      target.insertAdjacentElement("beforebegin", buildUnreadDivider(strings.newMessages));
      const offset = target.getBoundingClientRect().top - messagesContainer.getBoundingClientRect().top - 12;
      messagesContainer.scrollTop += offset;
    } else {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Opening the panel means those messages have now been seen.
    markAllRead();
  };

  const showGreeting = () => {
    messagesContainer.innerHTML = "";
    // Uses the tenant's real name (same label a real AI reply gets from the
    // server's sender_name) instead of the generic aiLabel fallback - so the
    // very first bubble a guest sees doesn't show one name and then
    // immediately switch to a different one on the next real reply.
    messagesContainer.appendChild(buildBubbleWrapper(strings.greeting, "bot", undefined, tenantName ?? null, strings));
  };

  // Appends a batch (ascending order) at the bottom - used for the initial
  // load, incoming poll deltas, and the guest's own just-sent message.
  const appendMessages = (messages: ChatMessage[], scrollDown = true) => {
    for (const msg of messages) {
      const dk = dayKey(msg.created_at);
      const pendingIndex = msg.sender === "user" ? pendingUserMessages.indexOf(msg.message) : -1;
      const alreadyRendered = pendingIndex !== -1;
      if (alreadyRendered) pendingUserMessages.splice(pendingIndex, 1);

      // No separator for the very first message ever rendered (bottomDayKey
      // still null) - a "Today" label directly under the greeting/at the top
      // of a brand-new thread is redundant, not a real day boundary.
      if (!alreadyRendered && bottomDayKey !== null && dk !== bottomDayKey) {
        messagesContainer.appendChild(buildDateSeparator(dayLabel(msg.created_at, strings)));
      }
      bottomDayKey = dk;
      if (topDayKey === null) topDayKey = dk;
      if (!alreadyRendered) {
        messagesContainer.appendChild(buildBubbleWrapper(msg.message, msg.sender, msg.created_at, msg.sender_name, strings, msg.original_message));
      }
      if (oldestLoadedAt === null || msg.created_at < oldestLoadedAt) oldestLoadedAt = msg.created_at;
      if (newestLoadedAt === null || msg.created_at > newestLoadedAt) newestLoadedAt = msg.created_at;
    }
    if (scrollDown) messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Prepends an older batch (ascending order) at the top on scroll-up,
  // preserving the guest's current scroll position (no visual jump).
  const prependMessages = (messages: ChatMessage[]) => {
    if (messages.length === 0) return;
    const borderingDayKey = topDayKey;
    const frag = document.createDocumentFragment();
    let runningDayKey: string | null = null;
    for (const msg of messages) {
      const dk = dayKey(msg.created_at);
      if (dk !== runningDayKey) {
        // The day-group bordering the existing top content already has a
        // separator right after it in the DOM - don't duplicate it.
        if (dk !== borderingDayKey) frag.appendChild(buildDateSeparator(dayLabel(msg.created_at, strings)));
        runningDayKey = dk;
      }
      frag.appendChild(buildBubbleWrapper(msg.message, msg.sender, msg.created_at, msg.sender_name, strings, msg.original_message));
    }
    topDayKey = dayKey(messages[0].created_at);

    const prevScrollHeight = messagesContainer.scrollHeight;
    const prevScrollTop = messagesContainer.scrollTop;
    messagesContainer.insertBefore(frag, messagesContainer.firstChild);
    messagesContainer.scrollTop = prevScrollTop + (messagesContainer.scrollHeight - prevScrollHeight);

    if (oldestLoadedAt === null || messages[0].created_at < oldestLoadedAt) oldestLoadedAt = messages[0].created_at;
  };

  // (Re)posts /api/session, but only BLOCKS opening on it when there's no
  // cached sessionId yet - a returning visitor's cached id is already usable
  // for loading history immediately, so refreshing its tenantId (needed
  // since a session created before tenantId-based routing existed would
  // otherwise stay stale forever) happens in the background instead of
  // adding a second sequential round-trip to every single open.
  const hadCachedSessionId = !!sessionId;
  const sessionInitPromise = (async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          userId: `user_${Math.random().toString(36).substring(2, 9)}`,
          tenantId,
          // The guest's language for admin-side translation: prefer an explicit
          // non-default page locale (they chose it), otherwise fall back to the
          // browser's preferred language so a Russian browser on the default
          // English site is still treated as Russian.
          lang: (() => {
            const SUPPORTED = ["en", "de", "ru", "uk", "es", "it", "fr", "pl"];
            const pageLang = (document.documentElement.lang || "").split("-")[0].toLowerCase();
            if (pageLang && pageLang !== "en") return pageLang;
            const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || "").split("-")[0].toLowerCase();
            return SUPPORTED.includes(browserLang) ? browserLang : "en";
          })(),
        })
      });
      const data = await res.json();
      sessionId = data.session.sessionId;
      localStorage.setItem(sessionStorageKey, sessionId!);
    } catch (e) {
      console.error("Failed to initialize chat session:", e);
    }
  })();

  if (!hadCachedSessionId) {
    await sessionInitPromise;
    if (!sessionId) {
      showGreeting();
      // No cached session id to fall back to - can't chat at all. Return a
      // no-op handle so callers' sendUserMessage() calls don't throw.
      return { sendUserMessage: async () => {}, scrollToFirstUnread: () => {} };
    }
  }

  // Red dot on the FAB when an admin reply arrives while the panel is closed
  // (full opacity too, so it doesn't read as "barely there" like the resting
  // state). Cleared the moment the guest actually looks at the panel.
  let unreadBadge: HTMLElement | null = null;
  const setUnread = (active: boolean) => {
    if (!unreadBadge) {
      unreadBadge = document.createElement("span");
      unreadBadge.className = "chat-fab-unread-badge";
      unreadBadge.style.cssText = "position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #ef4444; border: 2px solid var(--color-surface, #ffffff); border-radius: 9999px; display: none;";
      triggerBtn.style.position = triggerBtn.style.position || "relative";
      triggerBtn.appendChild(unreadBadge);
    }
    unreadBadge.style.display = active ? "block" : "none";
    triggerBtn.style.opacity = active ? "1" : "";
  };

  // Doubles as both the initial load AND the periodic poll: with no message
  // rendered yet (newestLoadedAt still null) it fetches the latest
  // HISTORY_PAGE_SIZE; once primed, every later call only asks for what's
  // newer (`after=`) - a small delta instead of ever re-fetching the whole
  // thread as it grows (see prependMessages/the scroll handler below for how
  // OLDER history is paged in instead, on demand).
  // Sound played once per unread period (reset when the panel is opened), so a
  // single reply arriving while closed chimes exactly once instead of once per
  // poll while that reply stays unread.
  let unreadNotified = false;

  const refreshMessages = async () => {
    const isFirstLoad = newestLoadedAt === null;
    try {
      const url = isFirstLoad
        ? `${WORKER_URL}/api/messages?sessionId=${sessionId}&limit=${HISTORY_PAGE_SIZE}`
        : `${WORKER_URL}/api/messages?sessionId=${sessionId}&after=${newestLoadedAt}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.messages && data.messages.length > 0) {
        if (isFirstLoad) {
          messagesContainer.innerHTML = "";
          hasMoreOlder = !!data.hasMore;
        }
        appendMessages(data.messages);

        // While the panel is open, everything that arrives is considered seen -
        // so the next reopen's "first unread" boundary starts from here.
        if (container.style.display !== "none") markAllRead();

        if (!isFirstLoad) {
          if (container.style.display === "none") {
            // "bot" here means a live AI-assistant reply (see the Worker's
            // hybrid autoresponder) - equally worth a nudge as an admin
            // reply, unlike the initial static greeting shown locally.
            if (data.messages.some((m: ChatMessage) => m.sender === "admin" || m.sender === "bot")) {
              setUnread(true);
              // Chime once per unread period (when the badge first lights up),
              // not on every subsequent poll that still sees the same unread
              // reply - that was producing a burst of duplicate notifications.
              if (!unreadNotified) {
                unreadNotified = true;
                playNotificationSound();
              }
            }
          } else {
            setUnread(false);
            unreadNotified = false;
          }
        }
      } else if (isFirstLoad) {
        showGreeting();
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
      if (isFirstLoad) showGreeting();
    }
  };

  await refreshMessages();

  // Picks up an admin's Telegram reply (routed back via the worker's
  // /telegram/webhook) without the guest needing to close/reopen the widget,
  // and keeps running while closed too, so the unread badge above can react
  // to a reply that arrives while the guest isn't looking. Self-rescheduling
  // (not setInterval) so the next poll never starts until the current one's
  // fetch has actually resolved - setInterval would fire on a fixed clock
  // regardless, and if a single poll ever took longer than the interval
  // (slow network/cold start), two overlapping polls could both process the
  // same incoming message and only one side of the dedup check would win,
  // rendering a real duplicate.
  // Poll gently - the GET handler no longer costs a KV read, so this interval is
  // just how quickly an admin's Telegram reply surfaces. 10s keeps that prompt
  // while halving worker/D1 requests (the 5s interval previously doubled as the
  // KV-read burn described in the worker's /api/messages GET handler).
  const POLL_INTERVAL_MS = 10000;
  const schedulePoll = () => {
    setTimeout(async () => {
      await refreshMessages();
      schedulePoll();
    }, POLL_INTERVAL_MS);
  };
  schedulePoll();

  // Loads an older page once the guest scrolls near the top, instead of
  // ever fetching the whole (potentially long) history up front.
  messagesContainer.addEventListener("scroll", () => {
    if (isLoadingOlder || !hasMoreOlder || oldestLoadedAt === null) return;
    if (messagesContainer.scrollTop > 40) return;
    isLoadingOlder = true;
    (async () => {
      try {
        const res = await fetch(`${WORKER_URL}/api/messages?sessionId=${sessionId}&before=${oldestLoadedAt}&limit=${HISTORY_PAGE_SIZE}`);
        const data = await res.json();
        if (data.success && data.messages && data.messages.length > 0) {
          hasMoreOlder = !!data.hasMore;
          prependMessages(data.messages);
        } else {
          hasMoreOlder = false;
        }
      } catch (e) {
        console.error("Failed to load older chat history:", e);
      } finally {
        isLoadingOlder = false;
      }
    })();
  });

  // Watch typing activity to resize input box smoothly
  input.addEventListener("input", () => autoResizeInput(input));

  closeBtn.addEventListener("click", () => {
    if (onClose) {
      onClose();
      return;
    }
    container.style.display = "none";
    triggerBtn.style.display = "flex";
  });

  // Swipe/pull the header downward to dismiss the chat. The panel visually
  // follows the pointer while dragging (live translateY), then snaps back
  // below the threshold or completes the close past it - works for touch and
  // mouse alike. `touch-action: none` keeps the browser from claiming the
  // vertical gesture as a scroll, and setPointerCapture keeps move/up events
  // coming even if the pointer briefly leaves the header.
  if (header && onClose) {
    const DRAG_CLOSE_PX = 96;
    let dragging = false;
    let startY = 0;

    const resetDrag = () => {
      dragging = false;
      panel.classList.remove('is-dragging');
      panel.style.transform = '';
    };

    header.addEventListener('pointerdown', (e) => {
      // Don't hijack the close button's own click.
      if (e.target instanceof Element && e.target.closest('#close-chat-btn')) return;
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      panel.classList.add('is-dragging');
      try {
        header.setPointerCapture(e.pointerId);
      } catch {
        // ignore (synthetic/already-inactive pointers)
      }
    });

    header.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - startY);
      panel.style.transform = `translateY(${dy}px)`;
    });

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - startY);
      resetDrag();
      if (dy > DRAG_CLOSE_PX) onClose();
    };

    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
  }

  // `overrideText` lets a caller (the intake wizard) send a composed message
  // through the exact same render + POST path as a typed one; when omitted,
  // the current input value is used (the normal Enter/button case).
  const sendMessage = async (overrideText?: string) => {
    const rawText = (overrideText ?? input.value).trim();
    // Render + dedup against the CLEAN text (see INTAKE_SUBMISSION_MARKER);
    // the raw text (with marker) is still what gets POSTed so the worker can
    // flag the intake submission to the sales AI.
    const text = rawText.startsWith(INTAKE_SUBMISSION_MARKER)
      ? rawText.slice(INTAKE_SUBMISSION_MARKER.length).trimStart()
      : rawText;
    // isSending guards against sendMessage firing twice for what should be
    // one action (e.g. a stray extra listener) - without it, two calls
    // would each optimistically render + POST the same text, a genuine
    // double row server-side, not just a rendering artifact.
    if (!text || isSending) return;
    isSending = true;

    // First real message of the session - clear the local-only greeting
    // bubble instead of appending after it (it was never a real message).
    if (newestLoadedAt === null) messagesContainer.innerHTML = "";

    appendMessages([{ sender: "user", message: text, sender_name: null, created_at: Date.now() }]);
    // Queued AFTER rendering (so this optimistic render itself doesn't
    // match its own empty queue) - lets appendMessages() recognize the
    // real server row for this same text when a later poll fetches it,
    // instead of rendering it a second time (see pendingUserMessages above).
    pendingUserMessages.push(text);
    // Only clear the visible input for a real typed send - an override send
    // (e.g. the intake result) must not wipe whatever the guest was typing.
    if (overrideText === undefined) {
      input.value = "";
      autoResizeInput(input);
    }

    try {
      await fetch(`${WORKER_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: rawText, sender: "user" })
      });
    } catch (e) {
      console.error("Failed to send message to server:", e);
    } finally {
      isSending = false;
    }
  };

  // Wrapped (not passed directly) so the click PointerEvent isn't mistaken
  // for sendMessage's overrideText parameter.
  sendBtn.addEventListener("click", () => sendMessage());
  
  // Guard multi-line wrap logic: Shift+Enter inserts break, lone Enter sends
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Expose the send + scroll paths so callers (the landing page's intake
  // wizard, or the panel's open handler) can drive the already-mounted widget.
  return { sendUserMessage: sendMessage, scrollToFirstUnread };
}