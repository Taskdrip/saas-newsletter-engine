import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, or, isNull } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/templates", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const category = req.query.category as string | undefined;

  let templates = await db.select().from(templatesTable);
  if (workspaceId) {
    templates = templates.filter(t => t.isGlobal || t.workspaceId === workspaceId);
  }
  if (category) {
    templates = templates.filter(t => t.category === category);
  }
  res.json(templates);
});

router.post("/templates", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, description, category, html } = req.body;
  if (!name || !category) { res.status(400).json({ error: "name and category required" }); return; }
  const [template] = await db.insert(templatesTable).values({ workspaceId, name, description, category: category || "custom", html }).returning();
  res.status(201).json(template);
});

router.get("/templates/:templateId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.templateId);
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
  if (!template) { res.status(404).json({ error: "Not found" }); return; }
  res.json(template);
});

router.patch("/templates/:templateId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.templateId);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "description", "category", "html"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(templatesTable).set(updates).where(eq(templatesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/templates/:templateId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.templateId);
  await db.delete(templatesTable).where(eq(templatesTable.id, id));
  res.sendStatus(204);
});

export default router;
