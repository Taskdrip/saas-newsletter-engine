import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, ilike, sql, inArray } from "drizzle-orm";
import { db, subscribersTable, subscriberListMembershipsTable, activityLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/subscribers", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const listId = req.query.listId ? parseInt(req.query.listId as string, 10) : undefined;
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);

  let query = db.select().from(subscribersTable);
  const conditions = [];
  if (workspaceId) conditions.push(eq(subscribersTable.workspaceId, workspaceId));
  if (status) conditions.push(eq(subscribersTable.status, status));

  let data = await query;
  if (conditions.length > 0) {
    data = await db.select().from(subscribersTable).where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }

  // Filter by search
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(sub =>
      sub.email.toLowerCase().includes(s) ||
      (sub.firstName && sub.firstName.toLowerCase().includes(s)) ||
      (sub.lastName && sub.lastName.toLowerCase().includes(s))
    );
  }

  // Enrich with listIds
  const enriched = await Promise.all(data.map(async (sub) => {
    const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.subscriberId, sub.id));
    return { ...sub, listIds: memberships.map(m => m.listId) };
  }));

  const total = enriched.length;
  const paginated = enriched.slice((page - 1) * limit, page * limit);
  res.json({ data: paginated, total, page, limit });
});

router.post("/subscribers", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, email, firstName, lastName, phone, tags, listIds, attributes } = req.body;
  if (!workspaceId || !email) { res.status(400).json({ error: "workspaceId and email required" }); return; }

  const [sub] = await db.insert(subscribersTable).values({
    workspaceId, email, firstName, lastName, phone,
    tags: tags || [], attributes: attributes || {},
  }).returning();

  if (listIds?.length) {
    for (const listId of listIds) {
      await db.insert(subscriberListMembershipsTable).values({ subscriberId: sub.id, listId }).onConflictDoNothing();
    }
  }

  // Log activity
  await db.insert(activityLogsTable).values({ workspaceId, type: "subscriber_added", description: `New subscriber: ${email}`, subscriberEmail: email });

  res.status(201).json({ ...sub, listIds: listIds || [] });
});

router.post("/subscribers/import", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, subscribers, listIds, updateExisting } = req.body;
  if (!workspaceId || !subscribers?.length) { res.status(400).json({ error: "workspaceId and subscribers required" }); return; }

  let imported = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    if (!sub.email) { errors.push(`Missing email`); skipped++; continue; }
    try {
      const existing = await db.select().from(subscribersTable).where(and(eq(subscribersTable.workspaceId, workspaceId), eq(subscribersTable.email, sub.email)));
      if (existing.length > 0 && !updateExisting) { skipped++; continue; }
      if (existing.length > 0 && updateExisting) {
        await db.update(subscribersTable).set({ firstName: sub.firstName, lastName: sub.lastName, tags: sub.tags || existing[0].tags || [] }).where(eq(subscribersTable.id, existing[0].id));
        updated++;
      } else {
        const [created] = await db.insert(subscribersTable).values({ workspaceId, email: sub.email, firstName: sub.firstName, lastName: sub.lastName, tags: sub.tags || [], attributes: sub.attributes || {} }).returning();
        if (listIds?.length) {
          for (const listId of listIds) {
            await db.insert(subscriberListMembershipsTable).values({ subscriberId: created.id, listId }).onConflictDoNothing();
          }
        }
        imported++;
      }
    } catch (e) {
      errors.push(`Error importing ${sub.email}`);
      skipped++;
    }
  }

  res.json({ imported, updated, skipped, errors });
});

router.get("/subscribers/:subscriberId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.subscriberId) ? req.params.subscriberId[0] : req.params.subscriberId, 10);
  const [sub] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, id));
  if (!sub) { res.status(404).json({ error: "Not found" }); return; }
  const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.subscriberId, id));
  res.json({ ...sub, listIds: memberships.map(m => m.listId) });
});

router.patch("/subscribers/:subscriberId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.subscriberId) ? req.params.subscriberId[0] : req.params.subscriberId, 10);
  const updates: Record<string, unknown> = {};
  const fields = ["email", "firstName", "lastName", "phone", "status", "tags", "attributes"];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const [updated] = await db.update(subscribersTable).set(updates).where(eq(subscribersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const memberships = await db.select().from(subscriberListMembershipsTable).where(eq(subscriberListMembershipsTable.subscriberId, id));
  res.json({ ...updated, listIds: memberships.map(m => m.listId) });
});

router.delete("/subscribers/:subscriberId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.subscriberId) ? req.params.subscriberId[0] : req.params.subscriberId, 10);
  await db.delete(subscribersTable).where(eq(subscribersTable.id, id));
  res.sendStatus(204);
});

export default router;
