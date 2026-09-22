// Static product knowledge for the FodyPay AI concierge.
//
// rent.wf syncs per-tenant facts from Google Sheets into D1; FodyPay is a
// single product, so its facts are authored here and bundled into the Worker at
// deploy time instead. The model reads prose (not a schema), so restate the key
// facts directly. Keep this in sync with src/i18n/ui.ts and the landing page by
// hand whenever product copy, pricing, or availability change.

export const FODYPAY_TENANT_ID = "fodypay";
export const FODYPAY_TENANT_NAME = "FodyPay";

export const FODYPAY_CONTEXT = [
  "WHAT FODYPAY IS: FodyPay is a Visa virtual card for everyday spending — a companion card, not a bank and not a " +
    "replacement for your main account. It works alongside any bank, is accepted anywhere Visa is (150+ countries), " +
    "and is designed to avoid surprise charges.",

  "HOW IT WORKS (under 5 minutes, no branch visit, no card in the post): " +
    "(1) Sign up & verify — create an account and verify your identity with a photo ID, which takes under 2 minutes " +
    "on your phone. " +
    "(2) Top up your balance — transfer from your existing bank account or debit card; there are no minimums, so load " +
    "exactly what you plan to spend. " +
    "(3) Get your virtual card — your Visa virtual card number is ready instantly (no 5–7 day delivery wait); add it " +
    "to Apple Pay or Google Pay and pay immediately, online or in-store.",

  "KEY FEATURES: " +
    "Better travel rates — converts at competitive mid-market rates and is built to work globally. " +
    "A dedicated card for the internet — use a separate virtual card for subscriptions, one-off purchases, and " +
    "unfamiliar checkouts, and freeze it in a tap if anything looks off (your main account stays safe). " +
    "Separate work from life — freelancers can load a project budget onto a dedicated card and track client expenses " +
    "separately. " +
    "Never your primary account — keep savings where they are and top up only what you need, like a prepaid but " +
    "smarter. " +
    "Instant virtual card — the number is ready the moment the account is set up.",

  "FEES & RATES: FodyPay is built to avoid surprise charges and converts travel spend at competitive mid-market " +
    "rates. If a visitor asks about a specific fee, rate, or charge that is not stated here, do not guess — tell them " +
    "a member of the team will confirm the exact figure.",

  "AVAILABILITY: FodyPay is currently in closed beta. The wait list is open — visitors can join to get in early and " +
    "skip the queue, and check whether FodyPay supports their region. Founding-member access is limited, and the card " +
    "is ready in about 2 minutes once a user is on board.",

  "CONTACT & SUPPORT: this chat is the fastest way to get help. If a question needs a human (or you don't know the " +
    "answer), let the visitor know a member of the team will follow up here shortly.",
].join("\n\n");
