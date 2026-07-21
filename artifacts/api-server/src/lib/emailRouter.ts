/**
 * Multi-provider email rotation engine
 *
 * Supports: Brevo, Resend, Mailersend, Mailjet, SendGrid, Postmark, Elastic Email, SMTP2GO
 * Strategy: quota-aware round-robin — picks the active provider with most remaining daily quota.
 * Falls back through providers automatically when one hits its daily/monthly limit.
 * Counters reset daily (00:00 UTC) and monthly (1st of month UTC).
 */

import { db, emailProvidersTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import type { EmailProvider } from "@workspace/db";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;          // overrides provider default
  fromName?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerId: number;
  providerName: string;
  providerType: string;
  messageId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quota helpers
// ─────────────────────────────────────────────────────────────────────────────

function needsDailyReset(provider: EmailProvider): boolean {
  const now = new Date();
  const reset = new Date(provider.lastDailyReset);
  return (
    now.getUTCFullYear() !== reset.getUTCFullYear() ||
    now.getUTCMonth() !== reset.getUTCMonth() ||
    now.getUTCDate() !== reset.getUTCDate()
  );
}

function needsMonthlyReset(provider: EmailProvider): boolean {
  const now = new Date();
  const reset = new Date(provider.lastMonthlyReset);
  return (
    now.getUTCFullYear() !== reset.getUTCFullYear() ||
    now.getUTCMonth() !== reset.getUTCMonth()
  );
}

async function resetCountersIfNeeded(provider: EmailProvider): Promise<EmailProvider> {
  const updates: Record<string, unknown> = {};
  const now = new Date();

  if (needsDailyReset(provider)) {
    updates.dailySent = 0;
    updates.lastDailyReset = now;
  }
  if (needsMonthlyReset(provider)) {
    updates.monthlySent = 0;
    updates.lastMonthlyReset = now;
  }

  if (Object.keys(updates).length > 0) {
    const [updated] = await db
      .update(emailProvidersTable)
      .set(updates)
      .where(eq(emailProvidersTable.id, provider.id))
      .returning();
    return updated;
  }
  return provider;
}

async function incrementSent(providerId: number): Promise<void> {
  const [p] = await db.select().from(emailProvidersTable).where(eq(emailProvidersTable.id, providerId));
  if (!p) return;
  await db
    .update(emailProvidersTable)
    .set({ dailySent: p.dailySent + 1, monthlySent: p.monthlySent + 1 })
    .where(eq(emailProvidersTable.id, providerId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider selection
// ─────────────────────────────────────────────────────────────────────────────

export async function pickBestProvider(): Promise<EmailProvider | null> {
  // Load all active providers sorted by priority desc
  const providers = await db
    .select()
    .from(emailProvidersTable)
    .where(eq(emailProvidersTable.isActive, true))
    .orderBy(desc(emailProvidersTable.priority));

  if (providers.length === 0) return null;

  // Reset counters + check quota
  const candidates: Array<EmailProvider & { dailyRemaining: number }> = [];

  for (let p of providers) {
    p = await resetCountersIfNeeded(p);
    const dailyRemaining = p.dailyLimit - p.dailySent;
    const monthlyRemaining = p.monthlyLimit - p.monthlySent;

    if (dailyRemaining > 0 && monthlyRemaining > 0) {
      candidates.push({ ...p, dailyRemaining });
    }
  }

  if (candidates.length === 0) return null;

  // Pick the provider with most daily remaining (tie-break: highest priority)
  candidates.sort((a, b) => b.dailyRemaining - a.dailyRemaining || b.priority - a.priority);
  return candidates[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-provider send implementations
// ─────────────────────────────────────────────────────────────────────────────

async function sendViaBrevo(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    sender: { name: params.fromName || provider.fromName, email: params.from || provider.fromEmail },
    to: to.map(email => ({ email })),
    replyTo: params.replyTo ? { email: params.replyTo } : undefined,
    subject: params.subject,
    htmlContent: params.html,
    textContent: params.text,
  };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": provider.apiKey!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Brevo: ${res.status} ${await res.text()}`);
  const data = await res.json() as { messageId?: string };
  return data.messageId;
}

async function sendViaResend(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    from: `${params.fromName || provider.fromName} <${params.from || provider.fromEmail}>`,
    to,
    reply_to: params.replyTo,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id?: string };
  return data.id;
}

async function sendViaMailersend(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    from: { email: params.from || provider.fromEmail, name: params.fromName || provider.fromName },
    to: to.map(email => ({ email })),
    reply_to: params.replyTo ? { email: params.replyTo } : undefined,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Mailersend: ${res.status} ${await res.text()}`);
  const msgId = res.headers.get("X-Message-Id") ?? undefined;
  return msgId;
}

async function sendViaMailjet(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const meta = (provider.metadata ?? {}) as Record<string, string>;
  const secret = meta.apiSecret ?? "";
  const credentials = Buffer.from(`${provider.apiKey}:${secret}`).toString("base64");
  const body = {
    Messages: [{
      From: { Email: params.from || provider.fromEmail, Name: params.fromName || provider.fromName },
      To: to.map(email => ({ Email: email })),
      ReplyTo: params.replyTo ? { Email: params.replyTo } : undefined,
      Subject: params.subject,
      HTMLPart: params.html,
      TextPart: params.text,
    }],
  };
  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Mailjet: ${res.status} ${await res.text()}`);
  const data = await res.json() as { Messages?: Array<{ To?: Array<{ MessageID?: string }> }> };
  return String(data.Messages?.[0]?.To?.[0]?.MessageID ?? "");
}

async function sendViaSendGrid(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    personalizations: [{ to: to.map(email => ({ email })) }],
    from: { email: params.from || provider.fromEmail, name: params.fromName || provider.fromName },
    reply_to: params.replyTo ? { email: params.replyTo } : undefined,
    subject: params.subject,
    content: [
      { type: "text/html", value: params.html },
      ...(params.text ? [{ type: "text/plain", value: params.text }] : []),
    ],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SendGrid: ${res.status} ${await res.text()}`);
  return res.headers.get("X-Message-Id") ?? undefined;
}

async function sendViaPostmark(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    From: `${params.fromName || provider.fromName} <${params.from || provider.fromEmail}>`,
    To: to.join(","),
    ReplyTo: params.replyTo,
    Subject: params.subject,
    HtmlBody: params.html,
    TextBody: params.text,
    MessageStream: "broadcast",
  };
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": provider.apiKey!, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Postmark: ${res.status} ${await res.text()}`);
  const data = await res.json() as { MessageID?: string };
  return data.MessageID;
}

async function sendViaElasticEmail(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    Recipients: { To: to },
    Content: {
      From: `${params.fromName || provider.fromName} <${params.from || provider.fromEmail}>`,
      ReplyTo: params.replyTo,
      Subject: params.subject,
      Body: [{ ContentType: "HTML", Content: params.html }],
    },
  };
  const res = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
    method: "POST",
    headers: { "X-ElasticEmail-ApiKey": provider.apiKey!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElasticEmail: ${res.status} ${await res.text()}`);
  const data = await res.json() as { TransactionID?: string };
  return data.TransactionID;
}

async function sendViaSmtp2go(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body = {
    api_key: provider.apiKey,
    to,
    sender: `${params.fromName || provider.fromName} <${params.from || provider.fromEmail}>`,
    subject: params.subject,
    html_body: params.html,
    text_body: params.text,
  };
  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SMTP2GO: ${res.status} ${await res.text()}`);
  const data = await res.json() as { data?: { email_id?: string } };
  return data.data?.email_id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatch
// ─────────────────────────────────────────────────────────────────────────────

async function sendWithProvider(provider: EmailProvider, params: SendEmailParams): Promise<string | undefined> {
  switch (provider.providerType) {
    case "brevo":        return sendViaBrevo(provider, params);
    case "resend":       return sendViaResend(provider, params);
    case "mailersend":   return sendViaMailersend(provider, params);
    case "mailjet":      return sendViaMailjet(provider, params);
    case "sendgrid":     return sendViaSendGrid(provider, params);
    case "postmark":     return sendViaPostmark(provider, params);
    case "elasticemail": return sendViaElasticEmail(provider, params);
    case "smtp2go":      return sendViaSmtp2go(provider, params);
    default:
      throw new Error(`Unsupported provider type: ${provider.providerType}`);
  }
}

/**
 * Send an email using the best available provider.
 * Automatically rotates to the next provider if the chosen one fails or is over quota.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const providers = await db
    .select()
    .from(emailProvidersTable)
    .where(eq(emailProvidersTable.isActive, true))
    .orderBy(desc(emailProvidersTable.priority));

  const errors: string[] = [];

  for (let p of providers) {
    p = await resetCountersIfNeeded(p);
    const dailyRemaining = p.dailyLimit - p.dailySent;
    const monthlyRemaining = p.monthlyLimit - p.monthlySent;

    if (dailyRemaining <= 0 || monthlyRemaining <= 0) {
      errors.push(`${p.name}: quota exhausted (daily: ${p.dailySent}/${p.dailyLimit}, monthly: ${p.monthlySent}/${p.monthlyLimit})`);
      continue;
    }

    try {
      const messageId = await sendWithProvider(p, params);
      await incrementSent(p.id);
      return { success: true, providerId: p.id, providerName: p.name, providerType: p.providerType, messageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${p.name}: ${msg}`);
      console.error(`[emailRouter] Provider ${p.name} failed:`, msg);
      // Continue to next provider
    }
  }

  return {
    success: false,
    providerId: 0,
    providerName: "none",
    providerType: "none",
    error: errors.length > 0 ? errors.join(" | ") : "No active email providers configured",
  };
}

/**
 * Get current status of all providers (quota, health).
 */
export async function getProviderStatus() {
  const providers = await db.select().from(emailProvidersTable).orderBy(desc(emailProvidersTable.priority));
  return providers.map(p => {
    const dailyRemaining = Math.max(0, p.dailyLimit - p.dailySent);
    const monthlyRemaining = Math.max(0, p.monthlyLimit - p.monthlySent);
    return {
      id: p.id,
      name: p.name,
      providerType: p.providerType,
      isActive: p.isActive,
      priority: p.priority,
      fromEmail: p.fromEmail,
      fromName: p.fromName,
      dailySent: p.dailySent,
      dailyLimit: p.dailyLimit,
      dailyRemaining,
      monthlySent: p.monthlySent,
      monthlyLimit: p.monthlyLimit,
      monthlyRemaining,
      dailyUsedPct: p.dailyLimit > 0 ? Math.round((p.dailySent / p.dailyLimit) * 100) : 0,
      monthlyUsedPct: p.monthlyLimit > 0 ? Math.round((p.monthlySent / p.monthlyLimit) * 100) : 0,
      hasApiKey: Boolean(p.apiKey),
    };
  });
}

export const PROVIDER_INFO: Record<string, {
  label: string;
  freeDailyLimit: number;
  freeMonthlyLimit: number;
  signupUrl: string;
  apiKeyLabel: string;
  requiresSecret?: boolean;
  secretLabel?: string;
  notes: string;
}> = {
  brevo: {
    label: "Brevo (Sendinblue)",
    freeDailyLimit: 300,
    freeMonthlyLimit: 9000,
    signupUrl: "https://app.brevo.com/settings/keys/api",
    apiKeyLabel: "API Key",
    notes: "300 emails/day free forever. Best free tier for newsletters.",
  },
  resend: {
    label: "Resend",
    freeDailyLimit: 100,
    freeMonthlyLimit: 3000,
    signupUrl: "https://resend.com/api-keys",
    apiKeyLabel: "API Key",
    notes: "3,000 emails/month free. Developer-friendly API.",
  },
  mailersend: {
    label: "Mailersend",
    freeDailyLimit: 100,
    freeMonthlyLimit: 3000,
    signupUrl: "https://app.mailersend.com/api-tokens",
    apiKeyLabel: "API Token",
    notes: "3,000 emails/month free. Excellent deliverability.",
  },
  mailjet: {
    label: "Mailjet",
    freeDailyLimit: 200,
    freeMonthlyLimit: 6000,
    signupUrl: "https://app.mailjet.com/account/apikeys",
    apiKeyLabel: "API Key",
    requiresSecret: true,
    secretLabel: "Secret Key",
    notes: "6,000 emails/month (200/day) free. Requires API Key + Secret.",
  },
  sendgrid: {
    label: "SendGrid",
    freeDailyLimit: 100,
    freeMonthlyLimit: 3000,
    signupUrl: "https://app.sendgrid.com/settings/api_keys",
    apiKeyLabel: "API Key",
    notes: "100 emails/day free forever.",
  },
  postmark: {
    label: "Postmark",
    freeDailyLimit: 100,
    freeMonthlyLimit: 3000,
    signupUrl: "https://account.postmarkapp.com/api_tokens",
    apiKeyLabel: "Server API Token",
    notes: "100 emails/day free (test sandbox). Best transactional deliverability.",
  },
  elasticemail: {
    label: "Elastic Email",
    freeDailyLimit: 100,
    freeMonthlyLimit: 3000,
    signupUrl: "https://elasticemail.com/account#/settings/new/create-api",
    apiKeyLabel: "API Key",
    notes: "100 emails/day free. Easy bulk sending.",
  },
  smtp2go: {
    label: "SMTP2GO",
    freeDailyLimit: 33,
    freeMonthlyLimit: 1000,
    signupUrl: "https://www.smtp2go.com/app/#/account/apikeys",
    apiKeyLabel: "API Key",
    notes: "1,000 emails/month free. High deliverability.",
  },
};
