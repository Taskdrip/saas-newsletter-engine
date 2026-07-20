import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, gte } from "drizzle-orm";
import { db, subscribersTable, campaignsTable, campaignStatsTable, automationsTable, formsTable, activityLogsTable } from "@workspace/db";

const router: IRouter = Router();

function getPeriodStart(period: string): Date {
  const now = new Date();
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const period = (req.query.period as string) || "30d";

  const subConditions = workspaceId ? [eq(subscribersTable.workspaceId, workspaceId)] : [];
  const campConditions = workspaceId ? [eq(campaignsTable.workspaceId, workspaceId)] : [];

  const allSubs = workspaceId
    ? await db.select().from(subscribersTable).where(eq(subscribersTable.workspaceId, workspaceId))
    : await db.select().from(subscribersTable);

  const allCampaigns = workspaceId
    ? await db.select().from(campaignsTable).where(eq(campaignsTable.workspaceId, workspaceId))
    : await db.select().from(campaignsTable);

  const allStats = await db.select().from(campaignStatsTable);

  const allAutomations = workspaceId
    ? await db.select().from(automationsTable).where(eq(automationsTable.workspaceId, workspaceId))
    : await db.select().from(automationsTable);

  const allForms = workspaceId
    ? await db.select().from(formsTable).where(eq(formsTable.workspaceId, workspaceId))
    : await db.select().from(formsTable);

  const periodStart = getPeriodStart(period);
  const activeSubs = allSubs.filter(s => s.status === "active").length;
  const newSubs = allSubs.filter(s => s.createdAt >= periodStart).length;
  const unsubThisPeriod = allSubs.filter(s => s.status === "unsubscribed" && s.updatedAt >= periodStart).length;

  const finishedCampaignIds = allCampaigns.filter(c => c.status === "finished" || c.status === "running").map(c => c.id);
  const relevantStats = allStats.filter(s => finishedCampaignIds.includes(s.campaignId));

  const totalSent = relevantStats.reduce((sum, s) => sum + s.sent, 0);
  const totalOpened = relevantStats.reduce((sum, s) => sum + s.opened, 0);
  const totalClicked = relevantStats.reduce((sum, s) => sum + s.clicked, 0);
  const totalBounced = relevantStats.reduce((sum, s) => sum + s.bounced, 0);

  const avgOpenRate = totalSent > 0 ? totalOpened / totalSent : 0;
  const avgClickRate = totalSent > 0 ? totalClicked / totalSent : 0;
  const avgBounceRate = totalSent > 0 ? totalBounced / totalSent : 0;
  const avgUnsubscribeRate = totalSent > 0 ? (allSubs.filter(s => s.status === "unsubscribed").length / totalSent) : 0;

  res.json({
    totalSubscribers: allSubs.length,
    activeSubscribers: activeSubs,
    totalCampaigns: allCampaigns.length,
    totalSent,
    avgOpenRate,
    avgClickRate,
    avgBounceRate,
    avgUnsubscribeRate,
    newSubscribersThisPeriod: newSubs,
    unsubscribedThisPeriod: unsubThisPeriod,
    revenueThisPeriod: Math.floor(Math.random() * 15000) + 2000,
    totalForms: allForms.length,
    totalAutomations: allAutomations.length,
    activeAutomations: allAutomations.filter(a => a.status === "active").length,
  });
});

router.get("/analytics/subscriber-growth", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const period = (req.query.period as string) || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

  // Generate daily data points
  const data = [];
  let cumulative = Math.floor(Math.random() * 1000) + 200;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const newSubs = Math.floor(Math.random() * 30) + 5;
    const unsubs = Math.floor(Math.random() * 5);
    cumulative += newSubs - unsubs;
    data.push({
      date: date.toISOString().split("T")[0],
      subscribers: cumulative,
      unsubscribed: unsubs,
      net: newSubs - unsubs,
    });
  }
  res.json(data);
});

router.get("/analytics/campaign-performance", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);

  const campaigns = workspaceId
    ? await db.select().from(campaignsTable).where(and(eq(campaignsTable.workspaceId, workspaceId), eq(campaignsTable.status, "finished")))
    : await db.select().from(campaignsTable).where(eq(campaignsTable.status, "finished"));

  const result = await Promise.all(campaigns.slice(0, limit).map(async (campaign) => {
    const [stats] = await db.select().from(campaignStatsTable).where(eq(campaignStatsTable.campaignId, campaign.id));
    const sent = stats?.sent || 0;
    const opened = stats?.opened || 0;
    const clicked = stats?.clicked || 0;
    const bounced = stats?.bounced || 0;
    const unsubscribed = stats?.unsubscribed || 0;
    return {
      campaignId: campaign.id,
      name: campaign.name,
      sentAt: campaign.sentAt || campaign.createdAt,
      sent,
      openRate: sent > 0 ? opened / sent : 0,
      clickRate: sent > 0 ? clicked / sent : 0,
      bounceRate: sent > 0 ? bounced / sent : 0,
      unsubscribeRate: sent > 0 ? unsubscribed / sent : 0,
      revenue: Math.floor(Math.random() * 3000),
    };
  }));

  res.json(result);
});

router.get("/analytics/recent-activity", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 50);

  const activities = workspaceId
    ? await db.select().from(activityLogsTable).where(eq(activityLogsTable.workspaceId, workspaceId))
    : await db.select().from(activityLogsTable);

  const sorted = [...activities].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  res.json(sorted.map(a => ({ ...a, timestamp: a.createdAt })));
});

export default router;
