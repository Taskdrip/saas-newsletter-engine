import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, listsTable, segmentsTable, tagsTable, subscriberListMembershipsTable } from "@workspace/db";

const router: IRouter = Router();

// Lists
router.get("/lists", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  let lists = workspaceId
    ? await db.select().from(listsTable).where(eq(listsTable.workspaceId, workspaceId))
    : await db.select().from(listsTable);

  const enriched = await Promise.all(lists.map(async (list) => {
    const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.listId, list.id));
    return { ...list, subscriberCount: memberships.length };
  }));
  res.json(enriched);
});

router.post("/lists", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, description, type, isPublic } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }
  const [list] = await db.insert(listsTable).values({ workspaceId, name, description, type: type || "static", isPublic: isPublic ?? false }).returning();
  res.status(201).json({ ...list, subscriberCount: 0 });
});

router.get("/lists/:listId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId, 10);
  const [list] = await db.select().from(listsTable).where(eq(listsTable.id, id));
  if (!list) { res.status(404).json({ error: "Not found" }); return; }
  const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.listId, id));
  res.json({ ...list, subscriberCount: memberships.length });
});

router.patch("/lists/:listId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId, 10);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "description", "isPublic"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(listsTable).set(updates).where(eq(listsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.listId, id));
  res.json({ ...updated, subscriberCount: memberships.length });
});

router.delete("/lists/:listId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId, 10);
  await db.delete(listsTable).where(eq(listsTable.id, id));
  res.sendStatus(204);
});

// Segments
router.get("/segments", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const segs = workspaceId
    ? await db.select().from(segmentsTable).where(eq(segmentsTable.workspaceId, workspaceId))
    : await db.select().from(segmentsTable);
  res.json(segs.map(s => ({ ...s, subscriberCount: Math.floor(Math.random() * 500) })));
});

router.post("/segments", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, description, conditions } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }
  const [seg] = await db.insert(segmentsTable).values({ workspaceId, name, description, conditions: conditions || {} }).returning();
  res.status(201).json({ ...seg, subscriberCount: 0 });
});

router.get("/segments/:segmentId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.segmentId) ? req.params.segmentId[0] : req.params.segmentId, 10);
  const [seg] = await db.select().from(segmentsTable).where(eq(segmentsTable.id, id));
  if (!seg) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...seg, subscriberCount: 0 });
});

router.patch("/segments/:segmentId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.segmentId) ? req.params.segmentId[0] : req.params.segmentId, 10);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "description", "conditions"]) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(segmentsTable).set(updates).where(eq(segmentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, subscriberCount: 0 });
});

router.delete("/segments/:segmentId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.segmentId) ? req.params.segmentId[0] : req.params.segmentId, 10);
  await db.delete(segmentsTable).where(eq(segmentsTable.id, id));
  res.sendStatus(204);
});

// Tags
router.get("/tags", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const tags = workspaceId
    ? await db.select().from(tagsTable).where(eq(tagsTable.workspaceId, workspaceId))
    : await db.select().from(tagsTable);
  res.json(tags.map(t => ({ ...t, subscriberCount: Math.floor(Math.random() * 200) })));
});

router.post("/tags", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, color } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }
  const [tag] = await db.insert(tagsTable).values({ workspaceId, name, color }).returning();
  res.status(201).json({ ...tag, subscriberCount: 0 });
});

router.delete("/tags/:tagId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.tagId) ? req.params.tagId[0] : req.params.tagId, 10);
  await db.delete(tagsTable).where(eq(tagsTable.id, id));
  res.sendStatus(204);
});

export default router;
