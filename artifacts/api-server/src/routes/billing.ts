import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, pricingPlansTable } from "@workspace/db";

const router: IRouter = Router();

// Default plans seeded when none exist in DB (mirrors admin route seeding)
const HARDCODED_FALLBACK = [
  { id: "free",       name: "Free",       price: 0,   interval: "month", limits: { subscribers: 1000,   emailsPerMonth: 10000,   workspaces: 1,  teamMembers: 1  }, features: ["1,000 subscribers","10,000 emails/month","1 workspace","Basic analytics","Email support"],                                                                              isPopular: false },
  { id: "starter",    name: "Starter",    price: 29,  interval: "month", limits: { subscribers: 10000,  emailsPerMonth: 100000,  workspaces: 3,  teamMembers: 5  }, features: ["10,000 subscribers","100,000 emails/month","3 workspaces","5 team members","Advanced analytics","A/B testing","Priority support"],                                      isPopular: false },
  { id: "pro",        name: "Pro",        price: 79,  interval: "month", limits: { subscribers: 50000,  emailsPerMonth: 500000,  workspaces: 10, teamMembers: 20 }, features: ["50,000 subscribers","500,000 emails/month","10 workspaces","20 team members","Full analytics","Automations","Custom domains","API access","24/7 support"],             isPopular: true  },
  { id: "business",   name: "Business",   price: 199, interval: "month", limits: { subscribers: 250000, emailsPerMonth: 2500000, workspaces: null, teamMembers: null }, features: ["250,000 subscribers","2.5M emails/month","Unlimited workspaces","Unlimited team members","Dedicated IP","Custom integrations","SLA guarantee","Dedicated manager"], isPopular: false },
  { id: "enterprise", name: "Enterprise", price: 599, interval: "month", limits: { subscribers: null,   emailsPerMonth: null,    workspaces: null, teamMembers: null }, features: ["Unlimited subscribers","Unlimited emails","Unlimited workspaces","Unlimited team members","SSO/SAML","Custom contracts","White-label","24/7 dedicated support"],  isPopular: false },
];

router.get("/billing/plans", async (_req, res): Promise<void> => {
  try {
    const dbPlans = await db
      .select()
      .from(pricingPlansTable)
      .where(eq(pricingPlansTable.isActive, true))
      .orderBy(pricingPlansTable.sortOrder);

    if (dbPlans.length > 0) {
      const formatted = dbPlans.map(p => ({
        id: p.slug,
        name: p.name,
        description: p.description,
        price: Math.round(p.priceMonthly / 100),
        priceYearly: Math.round(p.priceYearly / 100),
        interval: "month",
        limits: p.limits as Record<string, number | null>,
        features: p.features as string[],
        isPopular: p.isPopular,
        sortOrder: p.sortOrder,
      }));
      res.json(formatted);
      return;
    }
  } catch (_err) {
    // Table may not exist yet — fall through to hardcoded
  }
  res.json(HARDCODED_FALLBACK);
});

router.get("/billing/subscription", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = req.query.orgId ? parseInt(req.query.orgId as string, 10) : 1;

  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, orgId));
  if (!sub) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    [sub] = await db
      .insert(subscriptionsTable)
      .values({ orgId, planId: "free", planName: "Free", status: "active", currentPeriodEnd: periodEnd })
      .returning();
  }
  res.json({ ...sub, subscribersUsed: sub.subscribersUsed, emailsSentThisMonth: sub.emailsSentThisMonth });
});

router.post("/billing/subscription", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { planId, orgId = 1 } = req.body;
  if (!planId) { res.status(400).json({ error: "planId required" }); return; }

  // Look up plan name from DB first, fall back to hardcoded
  let planName = planId;
  try {
    const [dbPlan] = await db.select().from(pricingPlansTable).where(eq(pricingPlansTable.slug, planId));
    if (dbPlan) planName = dbPlan.name;
  } catch (_) { /* ignore */ }
  if (planName === planId) {
    const fallback = HARDCODED_FALLBACK.find(p => p.id === planId);
    if (!fallback) { res.status(400).json({ error: "Invalid plan" }); return; }
    planName = fallback.name;
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, orgId));
  if (sub) {
    [sub] = await db
      .update(subscriptionsTable)
      .set({ planId, planName, currentPeriodEnd: periodEnd })
      .where(eq(subscriptionsTable.orgId, orgId))
      .returning();
  } else {
    [sub] = await db
      .insert(subscriptionsTable)
      .values({ orgId, planId, planName, status: "active", currentPeriodEnd: periodEnd })
      .returning();
  }
  res.json(sub);
});

export default router;
