import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, campaignsTable, campaignStatsTable, activityLogsTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

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

router.post("/campaigns", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, subject, previewText, fromName, fromEmail, replyTo, type, templateId, listIds, segmentIds } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }
  const [campaign] = await db.insert(campaignsTable).values({
    workspaceId, name, subject, previewText, fromName, fromEmail, replyTo,
    type: type || "regular", templateId, listIds: listIds || [], segmentIds: segmentIds || [],
  }).returning();
  // Init stats
  await db.insert(campaignStatsTable).values({ campaignId: campaign.id }).onConflictDoNothing();
  res.status(201).json(campaign);
});

router.get("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

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

router.delete("/campaigns/:campaignId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.sendStatus(204);
});

router.post("/campaigns/:campaignId/send", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  const recipients = Math.floor(Math.random() * 5000) + 500;
  const [updated] = await db.update(campaignsTable).set({ status: "running", sentAt: new Date(), totalRecipients: recipients }).where(eq(campaignsTable.id, id)).returning();
  // Simulate stats
  await db.update(campaignStatsTable).set({ sent: recipients, delivered: Math.floor(recipients * 0.98), opened: Math.floor(recipients * 0.28), clicked: Math.floor(recipients * 0.06) }).where(eq(campaignStatsTable.campaignId, id));
  // Log activity
  await db.insert(activityLogsTable).values({ workspaceId: campaign.workspaceId, type: "campaign_sent", description: `Campaign sent: ${campaign.name}`, campaignName: campaign.name });
  res.json(updated);
});

router.post("/campaigns/:campaignId/schedule", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const { scheduledAt } = req.body;
  if (!scheduledAt) { res.status(400).json({ error: "scheduledAt required" }); return; }
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(campaignsTable).set({ status: "scheduled", scheduledAt: new Date(scheduledAt) }).where(eq(campaignsTable.id, id)).returning();
  await db.insert(activityLogsTable).values({ workspaceId: campaign.workspaceId, type: "campaign_scheduled", description: `Campaign scheduled: ${campaign.name}`, campaignName: campaign.name });
  res.json(updated);
});

router.post("/campaigns/:campaignId/duplicate", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
  const [original] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!original) { res.status(404).json({ error: "Not found" }); return; }
  const { id: _id, createdAt, updatedAt, sentAt, scheduledAt, ...rest } = original;
  const [copy] = await db.insert(campaignsTable).values({ ...rest, name: `${original.name} (Copy)`, status: "draft", totalRecipients: 0 }).returning();
  await db.insert(campaignStatsTable).values({ campaignId: copy.id }).onConflictDoNothing();
  res.status(201).json(copy);
});

router.get("/campaigns/:campaignId/stats", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.campaignId);
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
    revenue: stats.revenue / 100,
    topLinks: stats.topLinks || [],
    opensByDevice: stats.opensByDevice || { Desktop: 62, Mobile: 31, Tablet: 7 },
    opensByCountry: stats.opensByCountry || { "United States": 45, "United Kingdom": 18, Canada: 12, Australia: 8, Germany: 6, Other: 11 },
  });
});

export default router;
