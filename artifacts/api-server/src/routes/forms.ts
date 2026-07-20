import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, formsTable, websitesTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// Forms
router.get("/forms", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const forms = workspaceId
    ? await db.select().from(formsTable).where(eq(formsTable.workspaceId, workspaceId))
    : await db.select().from(formsTable);
  res.json(forms);
});

router.post("/forms", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, type, listIds } = req.body;
  if (!workspaceId || !name || !type) { res.status(400).json({ error: "workspaceId, name, and type required" }); return; }
  const embedCode = `<script src="https://cdn.campaignforge.io/forms/${Math.random().toString(36).slice(2)}.js" async></script>`;
  const [form] = await db.insert(formsTable).values({ workspaceId, name, type, listIds: listIds || [], embedCode }).returning();
  res.status(201).json(form);
});

router.get("/forms/:formId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.formId);
  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id));
  if (!form) { res.status(404).json({ error: "Not found" }); return; }
  res.json(form);
});

router.patch("/forms/:formId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.formId);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "status", "listIds"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(formsTable).set(updates).where(eq(formsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/forms/:formId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.formId);
  await db.delete(formsTable).where(eq(formsTable.id, id));
  res.sendStatus(204);
});

// Websites
router.get("/websites", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const websites = workspaceId
    ? await db.select().from(websitesTable).where(eq(websitesTable.workspaceId, workspaceId))
    : await db.select().from(websitesTable);
  res.json(websites);
});

router.post("/websites", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, url } = req.body;
  if (!workspaceId || !name || !url) { res.status(400).json({ error: "workspaceId, name, and url required" }); return; }
  const trackingScript = `<!-- CampaignForge Tracking -->\n<script async src="https://cdn.campaignforge.io/track.js" data-site="${Math.random().toString(36).slice(2, 10)}"></script>`;
  const [website] = await db.insert(websitesTable).values({ workspaceId, name, url, trackingScript, status: "unverified" }).returning();
  res.status(201).json(website);
});

router.get("/websites/:websiteId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.websiteId);
  const [website] = await db.select().from(websitesTable).where(eq(websitesTable.id, id));
  if (!website) { res.status(404).json({ error: "Not found" }); return; }
  res.json(website);
});

router.patch("/websites/:websiteId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.websiteId);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "url"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(websitesTable).set(updates).where(eq(websitesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/websites/:websiteId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.websiteId);
  await db.delete(websitesTable).where(eq(websitesTable.id, id));
  res.sendStatus(204);
});

export default router;
