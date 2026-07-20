import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, automationsTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/automations", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const automations = workspaceId
    ? await db.select().from(automationsTable).where(eq(automationsTable.workspaceId, workspaceId))
    : await db.select().from(automationsTable);
  res.json(automations);
});

router.post("/automations", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, description, trigger, steps } = req.body;
  if (!workspaceId || !name || !trigger) { res.status(400).json({ error: "workspaceId, name, and trigger required" }); return; }
  const [automation] = await db.insert(automationsTable).values({ workspaceId, name, description, trigger, steps: steps || [], status: "draft" }).returning();
  res.status(201).json(automation);
});

router.get("/automations/:automationId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.automationId);
  const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, id));
  if (!automation) { res.status(404).json({ error: "Not found" }); return; }
  res.json(automation);
});

router.patch("/automations/:automationId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.automationId);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "description", "trigger", "steps"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(automationsTable).set(updates).where(eq(automationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/automations/:automationId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.automationId);
  await db.delete(automationsTable).where(eq(automationsTable.id, id));
  res.sendStatus(204);
});

router.patch("/automations/:automationId/toggle", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.automationId);
  const { active } = req.body;
  const status = active ? "active" : "inactive";
  const [updated] = await db.update(automationsTable).set({ status }).where(eq(automationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

export default router;
