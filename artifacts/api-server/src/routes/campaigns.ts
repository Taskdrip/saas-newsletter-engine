import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db, campaignsTable, campaignStatsTable, activityLogsTable,
  subscribersTable, subscriberListMembershipsTable, listsTable, templatesTable,
} from "@workspace/db";
import * as lm from "../lib/listmonk.js";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

/** Build a plain-HTML body from template or a minimal fallback. */
function buildEmailHtml(subject: string, templateHtml: string | null | undefined): string {
  if (templateHtml) return templateHtml;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px">
  <h1 style="font-size:24px">${subject || "Newsletter"}</h1>
  <p>This campaign was sent via <strong>listmonk</strong>.</p>
  <p>Edit your template in CampaignForge to customise the email content.</p>
  <p style="font-size:12px;color:#999">
    To unsubscribe, click <a href="{{ UnsubscribeURL }}">here</a>.
  </p>
</body></html>`;
}

// ─── List campaigns ───────────────────────────────────────────────────────────

router.get("/campaigns", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);

  const conditions = [];
  if (workspaceId) conditions.push(eq(campaignsTable.workspaceId, workspaceId));
  if (status) conditions.push(eq(campaignsTable.status, status));

  let data = conditions.length > 0
    ? await db.select().from(campaignsTable).where(conditions.length === 1 ? conditions[0] : and(...conditions))
    : await db.select().from(campaignsTable);

  data = [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = data.length;
  const paginated = data.slice((page - 1) * limit, page * limit);
  res.json({ data: paginated, total, page, limit });
});

// ─── Create campaign ──────────────────────────────────────────────────────────

router.post("/campaigns", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, subject, previewText, fromName, fromEmail, replyTo, type, templateId, listIds, segmentIds } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }
  const [campaign] = await db.insert(campaignsTable).values({
    workspaceId, name, subject, previewText, fromName, fromEmail, replyTo,
    type: type || "regular", templateId, listIds: listIds || [], segmentIds: segmentIds || [],
  }).returning();
  await db.insert(campaignStatsTable).values({ campaignId: campaign.id }).onConflictDoNothing();
  res.status(201).json(campaign);
});

// ─── Get campaign ─────────────────────────────────────────────────────────────

router.get("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

// ─── Update campaign ──────────────────────────────────────────────────────────

router.patch("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "subject", "previewText", "fromName", "fromEmail", "replyTo", "templateId", "listIds", "segmentIds"];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(campaignsTable).set(updates).where(eq(campaignsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── Delete campaign ──────────────────────────────────────────────────────────

router.delete("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.sendStatus(204);
});

// ─── SEND campaign via listmonk ───────────────────────────────────────────────

router.post("/campaigns/:campaignId/send", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);

  // 1. Load campaign
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  if (campaign.status === "running" || campaign.status === "sent") {
    res.status(400).json({ error: `Campaign is already ${campaign.status}` }); return;
  }

  // 2. Check listmonk is reachable
  const listmonkUp = await lm.ping();
  if (!listmonkUp) {
    res.status(503).json({ error: "listmonk is not reachable. Make sure it is running on port 9000." });
    return;
  }

  try {
    // 3. Load template HTML (if any)
    let templateHtml: string | null = null;
    if (campaign.templateId) {
      const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, campaign.templateId));
      templateHtml = template?.html ?? null;
    }
    const htmlBody = buildEmailHtml(campaign.subject ?? campaign.name, templateHtml);

    // 4. Load subscribers from the campaign's lists
    let allSubscribers: Array<{ email: string; name: string }> = [];

    if (campaign.listIds && campaign.listIds.length > 0) {
      // Get subscriber IDs via list memberships
      const memberships = await db
        .select()
        .from(subscriberListMembershipsTable)
        .where(inArray(subscriberListMembershipsTable.listId, campaign.listIds));

      const subscriberIds = [...new Set(memberships.map(m => m.subscriberId))];

      if (subscriberIds.length > 0) {
        const subs = await db
          .select()
          .from(subscribersTable)
          .where(and(
            inArray(subscribersTable.id, subscriberIds),
            eq(subscribersTable.status, "active")
          ));
        allSubscribers = subs.map(s => ({
          email: s.email,
          name: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email,
        }));
      }
    }

    // If no subscribers in DB yet, still create the campaign in listmonk
    // (it can be populated later via listmonk's own subscriber management)
    const recipientCount = allSubscribers.length;

    // 5. Create / reuse a listmonk mailing list for this campaign
    const lmListName = `CampaignForge — ${campaign.name} (id:${campaign.id})`;
    const lmList = await lm.upsertList(lmListName);

    // 6. Bulk-sync subscribers into that listmonk list
    if (allSubscribers.length > 0) {
      const { success, failed } = await lm.bulkUpsertSubscribers(lmList.id, allSubscribers);
      console.log(`[listmonk] Synced ${success} subscribers (${failed} failed) to list ${lmList.id}`);
    }

    // 7. Create the listmonk campaign
    const fromEmail = campaign.fromEmail || process.env.LISTMONK_DEFAULT_FROM || "newsletter@example.com";
    const lmCampaign = await lm.createCampaign({
      name: campaign.name,
      subject: campaign.subject || campaign.name,
      fromEmail,
      listIds: [lmList.id],
      htmlBody,
    });

    // 8. Start the campaign (triggers actual sending)
    await lm.setCampaignStatus(lmCampaign.id, "running");

    // 9. Update our DB — store listmonk IDs for later stats sync
    const [updated] = await db
      .update(campaignsTable)
      .set({
        status: "running",
        sentAt: new Date(),
        totalRecipients: recipientCount,
        listmonkCampaignId: lmCampaign.id,
        listmonkListId: lmList.id,
      })
      .where(eq(campaignsTable.id, id))
      .returning();

    // Seed stats row
    await db
      .update(campaignStatsTable)
      .set({ sent: recipientCount, delivered: recipientCount })
      .where(eq(campaignStatsTable.campaignId, id));

    // Log activity
    await db.insert(activityLogsTable).values({
      workspaceId: campaign.workspaceId,
      type: "campaign_sent",
      description: `Campaign sent via listmonk: ${campaign.name} (${recipientCount} recipients)`,
      campaignName: campaign.name,
    });

    res.json({
      ...updated,
      listmonk: {
        campaignId: lmCampaign.id,
        listId: lmList.id,
        recipients: recipientCount,
        message: recipientCount === 0
          ? "Campaign created in listmonk with 0 subscribers. Add subscribers via listmonk admin or the CampaignForge audience section."
          : `Sending to ${recipientCount} subscribers via listmonk.`,
      },
    });
  } catch (err) {
    console.error("[listmonk send error]", err);
    res.status(500).json({
      error: "Failed to send via listmonk",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── Schedule campaign ────────────────────────────────────────────────────────

router.post("/campaigns/:campaignId/schedule", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const { scheduledAt } = req.body;
  if (!scheduledAt) { res.status(400).json({ error: "scheduledAt required" }); return; }
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db
    .update(campaignsTable)
    .set({ status: "scheduled", scheduledAt: new Date(scheduledAt) })
    .where(eq(campaignsTable.id, id))
    .returning();
  await db.insert(activityLogsTable).values({
    workspaceId: campaign.workspaceId,
    type: "campaign_scheduled",
    description: `Campaign scheduled: ${campaign.name}`,
    campaignName: campaign.name,
  });
  res.json(updated);
});

// ─── Duplicate campaign ───────────────────────────────────────────────────────

router.post("/campaigns/:campaignId/duplicate", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const [original] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!original) { res.status(404).json({ error: "Not found" }); return; }
  const { id: _id, createdAt, updatedAt, sentAt, scheduledAt, listmonkCampaignId: _lmCid, listmonkListId: _lmLid, ...rest } = original;
  const [copy] = await db.insert(campaignsTable).values({
    ...rest,
    name: `${original.name} (Copy)`,
    status: "draft",
    totalRecipients: 0,
  }).returning();
  await db.insert(campaignStatsTable).values({ campaignId: copy.id }).onConflictDoNothing();
  res.status(201).json(copy);
});

// ─── Campaign stats (synced from listmonk when available) ─────────────────────

router.get("/campaigns/:campaignId/stats", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);

  // Try to pull live stats from listmonk
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (campaign?.listmonkCampaignId) {
    try {
      const lmStats = await lm.getCampaignStats(campaign.listmonkCampaignId);
      // Persist latest stats back to our DB
      await db.update(campaignStatsTable).set({
        sent: lmStats.sent,
        delivered: lmStats.delivered,
        opened: lmStats.opened,
        clicked: lmStats.clicked,
        bounced: lmStats.bounced,
        unsubscribed: lmStats.unsubscribed,
      }).where(eq(campaignStatsTable.campaignId, id));

      const sent = lmStats.sent;
      res.json({
        campaignId: id,
        source: "listmonk",
        ...lmStats,
        openRate: sent > 0 ? lmStats.opened / sent : 0,
        clickRate: sent > 0 ? lmStats.clicked / sent : 0,
        bounceRate: sent > 0 ? lmStats.bounced / sent : 0,
        unsubscribeRate: sent > 0 ? lmStats.unsubscribed / sent : 0,
        revenue: 0,
        topLinks: [],
        opensByDevice: { Desktop: 0, Mobile: 0, Tablet: 0 },
        opensByCountry: {},
      });
      return;
    } catch (err) {
      console.warn("[listmonk stats fallback]", err);
      // Fall through to local DB stats
    }
  }

  // Fall back to local DB stats
  let [stats] = await db.select().from(campaignStatsTable).where(eq(campaignStatsTable.campaignId, id));
  if (!stats) {
    [stats] = await db.insert(campaignStatsTable).values({ campaignId: id }).returning();
  }
  const sent = stats.sent || 0;
  const opened = stats.opened || 0;
  const clicked = stats.clicked || 0;
  const bounced = stats.bounced || 0;
  const unsubscribed = stats.unsubscribed || 0;
  res.json({
    campaignId: id,
    source: "local",
    sent,
    delivered: stats.delivered || 0,
    opened,
    clicked,
    bounced,
    unsubscribed,
    complained: stats.complained || 0,
    openRate: sent > 0 ? opened / sent : 0,
    clickRate: sent > 0 ? clicked / sent : 0,
    bounceRate: sent > 0 ? bounced / sent : 0,
    unsubscribeRate: sent > 0 ? unsubscribed / sent : 0,
    revenue: (stats.revenue || 0) / 100,
    topLinks: stats.topLinks || [],
    opensByDevice: stats.opensByDevice || { Desktop: 0, Mobile: 0, Tablet: 0 },
    opensByCountry: stats.opensByCountry || {},
  });
});

export default router;
