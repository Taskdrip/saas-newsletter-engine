import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, organizationsTable, orgMembershipsTable, workspacesTable, subscriptionsTable } from "@workspace/db";

const router: IRouter = Router();

async function getUserId(clerkId: string, email: string): Promise<number> {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) [user] = await db.insert(usersTable).values({ clerkId, email }).returning();
  return user.id;
}

router.get("/organizations", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const email = (req as any).auth?.sessionClaims?.email as string ?? "";
  const userId = await getUserId(clerkId, email);

  const memberships = await db.select().from(orgMembershipsTable).where(eq(orgMembershipsTable.userId, userId));
  if (memberships.length === 0) {
    res.json([]); return;
  }
  const orgIds = memberships.map(m => m.orgId);
  const orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgIds[0]));
  // For multiple, return all
  const allOrgs = await Promise.all(orgIds.map(id =>
    db.select().from(organizationsTable).where(eq(organizationsTable.id, id)).then(r => r[0])
  ));
  res.json(allOrgs.filter(Boolean));
});

router.post("/organizations", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const email = (req as any).auth?.sessionClaims?.email as string ?? "";
  const userId = await getUserId(clerkId, email);

  const { name, slug, logoUrl } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [org] = await db.insert(organizationsTable).values({ name, slug: orgSlug, logoUrl, ownerId: userId }).returning();

  // Create owner membership
  await db.insert(orgMembershipsTable).values({ orgId: org.id, userId, role: "owner" });

  // Create default workspace
  const [workspace] = await db.insert(workspacesTable).values({ orgId: org.id, name: `${name}'s Workspace` }).returning();

  // Create free subscription
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await db.insert(subscriptionsTable).values({
    orgId: org.id,
    planId: "free",
    planName: "Free",
    status: "active",
    currentPeriodEnd: periodEnd,
  });

  res.status(201).json(org);
});

router.get("/organizations/:orgId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = parseInt(Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId, 10);
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) { res.status(404).json({ error: "Not found" }); return; }
  res.json(org);
});

router.patch("/organizations/:orgId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = parseInt(Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.logoUrl !== undefined) updates.logoUrl = req.body.logoUrl;
  const [updated] = await db.update(organizationsTable).set(updates).where(eq(organizationsTable.id, orgId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/organizations/:orgId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = parseInt(Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId, 10);
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  res.sendStatus(204);
});

export default router;
