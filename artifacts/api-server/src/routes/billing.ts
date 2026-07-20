import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";

const router: IRouter = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    interval: "month",
    limits: { subscribers: 1000, emailsPerMonth: 10000, workspaces: 1, teamMembers: 1 },
    features: ["1,000 subscribers", "10,000 emails/month", "1 workspace", "Basic analytics", "Email support"],
    isPopular: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "For growing businesses",
    price: 29,
    interval: "month",
    limits: { subscribers: 10000, emailsPerMonth: 100000, workspaces: 3, teamMembers: 5 },
    features: ["10,000 subscribers", "100,000 emails/month", "3 workspaces", "5 team members", "Advanced analytics", "A/B testing", "Priority support"],
    isPopular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For scaling teams",
    price: 79,
    interval: "month",
    limits: { subscribers: 50000, emailsPerMonth: 500000, workspaces: 10, teamMembers: 20 },
    features: ["50,000 subscribers", "500,000 emails/month", "10 workspaces", "20 team members", "Full analytics suite", "Automations", "Custom domains", "API access", "24/7 support"],
    isPopular: true,
  },
  {
    id: "business",
    name: "Business",
    description: "For high-volume senders",
    price: 199,
    interval: "month",
    limits: { subscribers: 250000, emailsPerMonth: 2500000, workspaces: null, teamMembers: null },
    features: ["250,000 subscribers", "2.5M emails/month", "Unlimited workspaces", "Unlimited team members", "Dedicated IP", "Custom integrations", "SLA guarantee", "Dedicated manager"],
    isPopular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale",
    price: 599,
    interval: "month",
    limits: { subscribers: null, emailsPerMonth: null, workspaces: null, teamMembers: null },
    features: ["Unlimited subscribers", "Unlimited emails", "Unlimited workspaces", "Unlimited team members", "SSO/SAML", "Custom contracts", "On-premise option", "White-label", "24/7 dedicated support"],
    isPopular: false,
  },
];

router.get("/billing/plans", async (_req, res): Promise<void> => {
  res.json(PLANS);
});

router.get("/billing/subscription", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = req.query.orgId ? parseInt(req.query.orgId as string, 10) : 1;

  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, orgId));
  if (!sub) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    [sub] = await db.insert(subscriptionsTable).values({ orgId, planId: "free", planName: "Free", status: "active", currentPeriodEnd: periodEnd }).returning();
  }
  res.json({ ...sub, subscribersUsed: sub.subscribersUsed, emailsSentThisMonth: sub.emailsSentThisMonth });
});

router.post("/billing/subscription", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { planId, orgId = 1 } = req.body;
  if (!planId) { res.status(400).json({ error: "planId required" }); return; }

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) { res.status(400).json({ error: "Invalid plan" }); return; }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, orgId));
  if (sub) {
    [sub] = await db.update(subscriptionsTable).set({ planId, planName: plan.name, currentPeriodEnd: periodEnd }).where(eq(subscriptionsTable.orgId, orgId)).returning();
  } else {
    [sub] = await db.insert(subscriptionsTable).values({ orgId, planId, planName: plan.name, status: "active", currentPeriodEnd: periodEnd }).returning();
  }
  res.json(sub);
});

export default router;
