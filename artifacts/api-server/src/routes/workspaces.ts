import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, workspacesTable, workspaceMembersTable, subscribersTable } from "@workspace/db";

const router: IRouter = Router();

async function getUserId(clerkId: string, email: string): Promise<number> {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) [user] = await db.insert(usersTable).values({ clerkId, email }).returning();
  return user.id;
}

router.get("/workspaces", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orgId = req.query.orgId ? parseInt(req.query.orgId as string, 10) : undefined;

  let workspaces;
  if (orgId) {
    workspaces = await db.select().from(workspacesTable).where(eq(workspacesTable.orgId, orgId));
  } else {
    workspaces = await db.select().from(workspacesTable);
  }

  // Enrich with subscriber counts
  const enriched = await Promise.all(workspaces.map(async (ws) => {
    const subs = await db.select().from(subscribersTable).where(eq(subscribersTable.workspaceId, ws.id));
    return { ...ws, subscriberCount: subs.length };
  }));

  res.json(enriched);
});

router.post("/workspaces", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { orgId, name, description, fromName, fromEmail, replyToEmail, timezone } = req.body;
  if (!orgId || !name) { res.status(400).json({ error: "orgId and name are required" }); return; }
  const [ws] = await db.insert(workspacesTable).values({ orgId, name, description, fromName, fromEmail, replyToEmail, timezone }).returning();
  res.status(201).json({ ...ws, subscriberCount: 0 });
});

router.get("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const wsId = parseInt(Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId, 10);
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, wsId));
  if (!ws) { res.status(404).json({ error: "Not found" }); return; }
  const subs = await db.select().from(subscribersTable).where(eq(subscribersTable.workspaceId, wsId));
  res.json({ ...ws, subscriberCount: subs.length });
});

router.patch("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const wsId = parseInt(Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId, 10);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "fromName", "fromEmail", "replyToEmail", "timezone"];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(workspacesTable).set(updates).where(eq(workspacesTable.id, wsId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const subs = await db.select().from(subscribersTable).where(eq(subscribersTable.workspaceId, wsId));
  res.json({ ...updated, subscriberCount: subs.length });
});

router.delete("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const wsId = parseInt(Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId, 10);
  await db.delete(workspacesTable).where(eq(workspacesTable.id, wsId));
  res.sendStatus(204);
});

// Members
router.get("/workspaces/:workspaceId/members", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const wsId = parseInt(Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId, 10);
  const members = await db.select().from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, wsId));
  res.json(members);
});

router.post("/workspaces/:workspaceId/members", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const wsId = parseInt(Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId, 10);
  const { email, role } = req.body;
  if (!email || !role) { res.status(400).json({ error: "email and role required" }); return; }
  const [member] = await db.insert(workspaceMembersTable).values({ workspaceId: wsId, email, role, status: "invited" }).returning();
  res.status(201).json(member);
});

router.patch("/workspaces/:workspaceId/members/:memberId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberId = parseInt(Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId, 10);
  const { role } = req.body;
  const [updated] = await db.update(workspaceMembersTable).set({ role }).where(eq(workspaceMembersTable.id, memberId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/workspaces/:workspaceId/members/:memberId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberId = parseInt(Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId, 10);
  await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.id, memberId));
  res.sendStatus(204);
});

export default router;
