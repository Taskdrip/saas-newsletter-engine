/**
 * listmonk API client
 *
 * listmonk runs alongside this API server on port 9000.
 * Override with env vars for Railway/production:
 *   LISTMONK_URL      – defaults to http://localhost:9000
 *   LISTMONK_USER     – defaults to admin
 *   LISTMONK_PASSWORD – defaults to listmonk_admin_2024
 */

const LISTMONK_URL = (process.env.LISTMONK_URL || "http://localhost:9000").replace(/\/$/, "");
const LISTMONK_API_TOKEN = process.env.LISTMONK_API_TOKEN || "";   // preferred: Settings → API Keys
const LISTMONK_USER = process.env.LISTMONK_USER || "";
const LISTMONK_PASSWORD = process.env.LISTMONK_PASSWORD || "";

function authHeader(): string {
  if (LISTMONK_API_TOKEN) {
    // listmonk v6 API token — created in Settings → API Keys
    return `token ${LISTMONK_API_TOKEN}`;
  }
  if (LISTMONK_USER && LISTMONK_PASSWORD) {
    // HTTP Basic Auth (username + password)
    return "Basic " + Buffer.from(`${LISTMONK_USER}:${LISTMONK_PASSWORD}`).toString("base64");
  }
  throw new Error(
    "listmonk credentials not configured. Set LISTMONK_API_TOKEN (preferred) or " +
    "both LISTMONK_USER and LISTMONK_PASSWORD environment variables."
  );
}

async function lmFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const url = `${LISTMONK_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(opts.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`listmonk ${opts.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  // Some endpoints return 204 with no body
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (minimal subset of what listmonk returns)
// ─────────────────────────────────────────────────────────────────────────────

export interface LMList {
  id: number;
  uuid: string;
  name: string;
  type: string;
  optin: string;
  subscriber_count: number;
}

export interface LMSubscriber {
  id: number;
  uuid: string;
  email: string;
  name: string;
  status: string;
  lists: Array<{ id: number }>;
}

export interface LMCampaign {
  id: number;
  uuid: string;
  name: string;
  status: string;
  subject: string;
  stats: {
    sent?: number;
    views?: number;
    clicks?: number;
    bounces?: number;
    unsubscribes?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

export async function ping(): Promise<boolean> {
  try {
    await fetch(`${LISTMONK_URL}/api/health`);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lists
// ─────────────────────────────────────────────────────────────────────────────

export async function getLists(): Promise<LMList[]> {
  const data = await lmFetch<{ data: { results: LMList[] } }>("/api/lists?per_page=all");
  return data.data?.results ?? [];
}

/** Create a mailing list in listmonk. Returns the new list. */
export async function createList(name: string): Promise<LMList> {
  const data = await lmFetch<{ data: LMList }>("/api/lists", {
    method: "POST",
    body: JSON.stringify({ name, type: "private", optin: "single", tags: [] }),
  });
  return data.data;
}

/** Find an existing list by name, or create it if missing. */
export async function upsertList(name: string): Promise<LMList> {
  const lists = await getLists();
  const existing = lists.find(l => l.name === name);
  if (existing) return existing;
  return createList(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a subscriber in listmonk and subscribe them to a list.
 * listmonk deduplicates by email — re-posting an existing email just updates it.
 */
export async function upsertSubscriber(
  email: string,
  name: string,
  listIds: number[],
  attribs: Record<string, unknown> = {}
): Promise<LMSubscriber> {
  const data = await lmFetch<{ data: LMSubscriber }>("/api/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email,
      name: name || email,
      status: "enabled",
      lists: listIds,
      attribs,
      preconfirm_subscriptions: true,
    }),
  });
  return data.data;
}

/**
 * Bulk-upsert subscribers into a listmonk list.
 * Runs sequentially to avoid overloading listmonk — fine for thousands of contacts.
 */
export async function bulkUpsertSubscribers(
  listmonkListId: number,
  subscribers: Array<{ email: string; name: string; attribs?: Record<string, unknown> }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const sub of subscribers) {
    try {
      await upsertSubscriber(sub.email, sub.name, [listmonkListId], sub.attribs ?? {});
      success++;
    } catch (err) {
      console.error(`[listmonk] Failed to upsert ${sub.email}:`, err);
      failed++;
    }
  }
  return { success, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCampaignParams {
  name: string;
  subject: string;
  fromEmail: string;
  listIds: number[];      // listmonk list IDs
  htmlBody: string;
  contentType?: "rawhtml" | "richtext" | "markdown";
}

/** Create a campaign in listmonk. Returns the campaign record. */
export async function createCampaign(params: CreateCampaignParams): Promise<LMCampaign> {
  const data = await lmFetch<{ data: LMCampaign }>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      subject: params.subject,
      from_email: params.fromEmail,
      lists: params.listIds,
      type: "regular",
      content_type: params.contentType ?? "rawhtml",
      body: params.htmlBody,
      send_at: null,
      tags: [],
    }),
  });
  return data.data;
}

/** Change campaign status. Use "running" to trigger sending. */
export async function setCampaignStatus(
  campaignId: number,
  status: "draft" | "scheduled" | "running" | "paused" | "cancelled"
): Promise<LMCampaign> {
  const data = await lmFetch<{ data: LMCampaign }>(`/api/campaigns/${campaignId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return data.data;
}

/** Get a campaign with its current stats. */
export async function getCampaign(campaignId: number): Promise<LMCampaign> {
  const data = await lmFetch<{ data: LMCampaign }>(`/api/campaigns/${campaignId}`);
  return data.data;
}

/** Fetch real stats for a campaign from listmonk. */
export async function getCampaignStats(campaignId: number) {
  const campaign = await getCampaign(campaignId);
  const stats = campaign.stats ?? {};
  const sent = stats.sent ?? 0;
  const views = stats.views ?? 0;
  const clicks = stats.clicks ?? 0;
  const bounces = stats.bounces ?? 0;
  const unsubscribes = stats.unsubscribes ?? 0;
  return {
    sent,
    delivered: sent - bounces,
    opened: views,
    clicked: clicks,
    bounced: bounces,
    unsubscribed: unsubscribes,
    openRate: sent > 0 ? views / sent : 0,
    clickRate: sent > 0 ? clicks / sent : 0,
    bounceRate: sent > 0 ? bounces / sent : 0,
    unsubscribeRate: sent > 0 ? unsubscribes / sent : 0,
  };
}
