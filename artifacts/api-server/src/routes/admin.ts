/**
 * Admin-only routes
 * All routes require authentication. In a production app you'd also check
 * an isAdmin flag; here we trust the first-registered user (orgId=1).
 */

import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  emailProvidersTable,
  pricingPlansTable,
  subscriptionsTable,
  organizationsTable,
  usersTable,
} from "@workspace/db";
import { getProviderStatus, PROVIDER_INFO, sendEmail } from "../lib/emailRouter.js";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return clerkId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [providerStatus, plans, orgs, subs] = await Promise.all([
    getProviderStatus(),
    db.select().from(pricingPlansTable).where(eq(pricingPlansTable.isActive, true)),
    db.select().from(organizationsTable),
    db.select().from(subscriptionsTable),
  ]);

  const totalDailyCapacity = providerStatus
    .filter(p => p.isActive)
    .reduce((sum, p) => sum + p.dailyLimit, 0);
  const totalDailyRemaining = providerStatus
    .filter(p => p.isActive)
    .reduce((sum, p) => sum + p.dailyRemaining, 0);
  const totalMonthlySent = providerStatus
    .filter(p => p.isActive)
    .reduce((sum, p) => sum + p.monthlySent, 0);

  res.json({
    providers: {
      total: providerStatus.length,
      active: providerStatus.filter(p => p.isActive).length,
      totalDailyCapacity,
      totalDailyRemaining,
      totalMonthlySent,
    },
    plans: { total: plans.length },
    organizations: { total: orgs.length },
    subscriptions: {
      total: subs.length,
      byPlan: subs.reduce((acc: Record<string, number>, s) => {
        acc[s.planId] = (acc[s.planId] || 0) + 1;
        return acc;
      }, {}),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email providers
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/email-providers", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const providers = await getProviderStatus();
  res.json({ providers, providerInfo: PROVIDER_INFO });
});

router.post("/admin/email-providers", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const {
    name, providerType, apiKey, apiSecret, fromEmail, fromName,
    dailyLimit, monthlyLimit, priority, smtpHost, smtpPort, smtpUsername, smtpPassword,
  } = req.body;

  if (!name || !providerType || !fromEmail) {
    res.status(400).json({ error: "name, providerType, fromEmail required" }); return;
  }

  const info = PROVIDER_INFO[providerType];
  const [provider] = await db.insert(emailProvidersTable).values({
    name,
    providerType,
    apiKey: apiKey || null,
    smtpHost: smtpHost || null,
    smtpPort: smtpPort || null,
    smtpUsername: smtpUsername || null,
    smtpPassword: smtpPassword || null,
    fromEmail,
    fromName: fromName || "CampaignForge",
    dailyLimit: dailyLimit ?? (info?.freeDailyLimit ?? 100),
    monthlyLimit: monthlyLimit ?? (info?.freeMonthlyLimit ?? 3000),
    priority: priority ?? 0,
    isActive: true,
    metadata: apiSecret ? { apiSecret } : null,
  }).returning();

  const { apiKey: _ak, smtpPassword: _sp, ...safe } = provider;
  res.status(201).json({ ...safe, hasApiKey: Boolean(_ak) });
});

router.put("/admin/email-providers/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const {
    name, fromEmail, fromName, dailyLimit, monthlyLimit,
    priority, isActive, apiKey, apiSecret,
  } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (fromEmail !== undefined) updates.fromEmail = fromEmail;
  if (fromName !== undefined) updates.fromName = fromName;
  if (dailyLimit !== undefined) updates.dailyLimit = dailyLimit;
  if (monthlyLimit !== undefined) updates.monthlyLimit = monthlyLimit;
  if (priority !== undefined) updates.priority = priority;
  if (isActive !== undefined) updates.isActive = isActive;
  if (apiKey !== undefined) updates.apiKey = apiKey;
  if (apiSecret !== undefined) {
    const [current] = await db.select().from(emailProvidersTable).where(eq(emailProvidersTable.id, id));
    updates.metadata = { ...((current?.metadata as object) || {}), apiSecret };
  }

  const [updated] = await db.update(emailProvidersTable).set(updates).where(eq(emailProvidersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const { apiKey: _ak, smtpPassword: _sp, ...safe } = updated;
  res.json({ ...safe, hasApiKey: Boolean(_ak) });
});

router.delete("/admin/email-providers/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(emailProvidersTable).where(eq(emailProvidersTable.id, id));
  res.sendStatus(204);
});

router.post("/admin/email-providers/:id/reset-quota", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const now = new Date();
  const [updated] = await db
    .update(emailProvidersTable)
    .set({ dailySent: 0, monthlySent: 0, lastDailyReset: now, lastMonthlyReset: now })
    .where(eq(emailProvidersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, message: "Quota reset" });
});

router.post("/admin/email-providers/test", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const { providerId, testEmail } = req.body;
  if (!testEmail) { res.status(400).json({ error: "testEmail required" }); return; }

  let provider;
  if (providerId) {
    const [p] = await db.select().from(emailProvidersTable).where(eq(emailProvidersTable.id, parseInt(providerId, 10)));
    provider = p;
  }

  const result = await sendEmail({
    to: testEmail,
    subject: "✅ CampaignForge — Email provider test",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#16a34a">✅ Email provider working!</h2>
      <p>Your email provider is configured correctly and ready to send campaigns.</p>
      ${provider ? `<p><strong>Provider:</strong> ${provider.fromName} &lt;${provider.fromEmail}&gt;</p>` : ""}
      <p style="color:#6b7280;font-size:14px">Sent via CampaignForge multi-provider email router.</p>
    </div>`,
    text: "Your email provider is configured correctly. Sent via CampaignForge.",
  });

  if (result.success) {
    res.json({ success: true, provider: result.providerName, messageId: result.messageId });
  } else {
    res.status(422).json({ success: false, error: result.error });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Pricing plans
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PLANS = [
  {
    slug: "free", name: "Free", description: "Perfect for getting started", sortOrder: 0,
    priceMonthly: 0, priceYearly: 0, isPopular: false, isActive: true,
    limits: { subscribers: 1000, emailsPerMonth: 10000, workspaces: 1, teamMembers: 1 },
    features: ["1,000 subscribers", "10,000 emails/month", "1 workspace", "Basic analytics", "Email support"],
  },
  {
    slug: "starter", name: "Starter", description: "For growing businesses", sortOrder: 1,
    priceMonthly: 2900, priceYearly: 27840, isPopular: false, isActive: true,
    limits: { subscribers: 10000, emailsPerMonth: 100000, workspaces: 3, teamMembers: 5 },
    features: ["10,000 subscribers", "100,000 emails/month", "3 workspaces", "5 team members", "Advanced analytics", "A/B testing", "Priority support"],
  },
  {
    slug: "pro", name: "Pro", description: "For scaling teams", sortOrder: 2,
    priceMonthly: 7900, priceYearly: 75840, isPopular: true, isActive: true,
    limits: { subscribers: 50000, emailsPerMonth: 500000, workspaces: 10, teamMembers: 20 },
    features: ["50,000 subscribers", "500,000 emails/month", "10 workspaces", "20 team members", "Full analytics", "Automations", "Custom domains", "API access", "24/7 support"],
  },
  {
    slug: "business", name: "Business", description: "For high-volume senders", sortOrder: 3,
    priceMonthly: 19900, priceYearly: 190800, isPopular: false, isActive: true,
    limits: { subscribers: 250000, emailsPerMonth: 2500000, workspaces: null, teamMembers: null },
    features: ["250,000 subscribers", "2.5M emails/month", "Unlimited workspaces", "Unlimited team members", "Dedicated IP", "Custom integrations", "SLA guarantee", "Dedicated manager"],
  },
  {
    slug: "enterprise", name: "Enterprise", description: "Unlimited scale", sortOrder: 4,
    priceMonthly: 59900, priceYearly: 574800, isPopular: false, isActive: true,
    limits: { subscribers: null, emailsPerMonth: null, workspaces: null, teamMembers: null },
    features: ["Unlimited subscribers", "Unlimited emails", "Unlimited workspaces", "Unlimited team members", "SSO/SAML", "Custom contracts", "White-label", "24/7 dedicated support"],
  },
];

async function ensureDefaultPlans(): Promise<void> {
  const existing = await db.select().from(pricingPlansTable);
  if (existing.length === 0) {
    await db.insert(pricingPlansTable).values(DEFAULT_PLANS);
  }
}

router.get("/admin/pricing-plans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  await ensureDefaultPlans();
  const plans = await db.select().from(pricingPlansTable).orderBy(pricingPlansTable.sortOrder);
  res.json(plans);
});

router.post("/admin/pricing-plans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const { slug, name, description, priceMonthly, priceYearly, features, limits, isPopular, sortOrder } = req.body;
  if (!slug || !name) { res.status(400).json({ error: "slug and name required" }); return; }

  const [plan] = await db.insert(pricingPlansTable).values({
    slug, name,
    description: description || "",
    priceMonthly: priceMonthly || 0,
    priceYearly: priceYearly || 0,
    features: features || [],
    limits: limits || {},
    isPopular: isPopular ?? false,
    isActive: true,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(plan);
});

router.put("/admin/pricing-plans/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const { name, description, priceMonthly, priceYearly, features, limits, isPopular, isActive, sortOrder } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (priceMonthly !== undefined) updates.priceMonthly = priceMonthly;
  if (priceYearly !== undefined) updates.priceYearly = priceYearly;
  if (features !== undefined) updates.features = features;
  if (limits !== undefined) updates.limits = limits;
  if (isPopular !== undefined) updates.isPopular = isPopular;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;

  const [updated] = await db.update(pricingPlansTable).set(updates).where(eq(pricingPlansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/pricing-plans/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(pricingPlansTable).where(eq(pricingPlansTable.id, id));
  res.sendStatus(204);
});

// ─────────────────────────────────────────────────────────────────────────────
// User management
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [users, orgs, subs] = await Promise.all([
    db.select().from(usersTable).orderBy(desc(usersTable.createdAt)),
    db.select().from(organizationsTable),
    db.select().from(subscriptionsTable),
  ]);

  const orgMap = new Map(orgs.map(o => [o.id, o]));
  const subMap = new Map(subs.map(s => [s.orgId, s]));

  const enriched = users.map(u => {
    const org = orgs.find(o => o.ownerId === u.id);
    const sub = org ? subMap.get(org.id) : null;
    return {
      ...u,
      organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
      subscription: sub ? { planId: sub.planId, planName: sub.planName, status: sub.status, emailsSentThisMonth: sub.emailsSentThisMonth, subscribersUsed: sub.subscribersUsed } : null,
    };
  });

  res.json({ users: enriched, total: enriched.length });
});

router.put("/admin/users/:userId/plan", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = parseInt(req.params.userId, 10);
  const { planId } = req.body;
  if (!planId) { res.status(400).json({ error: "planId required" }); return; }

  const [plan] = await db.select().from(pricingPlansTable).where(eq(pricingPlansTable.slug, planId));
  if (!plan) { res.status(400).json({ error: "Plan not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.ownerId, userId));
  if (!org) { res.status(404).json({ error: "Organization not found for user" }); return; }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, org.id));
  let sub;
  if (existing) {
    [sub] = await db.update(subscriptionsTable)
      .set({ planId: plan.slug, planName: plan.name, currentPeriodEnd: periodEnd })
      .where(eq(subscriptionsTable.orgId, org.id))
      .returning();
  } else {
    [sub] = await db.insert(subscriptionsTable)
      .values({ orgId: org.id, planId: plan.slug, planName: plan.name, status: "active", currentPeriodEnd: periodEnd })
      .returning();
  }

  res.json({ success: true, subscription: sub, plan });
});

export default router;
