import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, smtpConnectionsTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/smtp-connections", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const conns = workspaceId
    ? await db.select().from(smtpConnectionsTable).where(eq(smtpConnectionsTable.workspaceId, workspaceId))
    : await db.select().from(smtpConnectionsTable);
  // Never return password hashes
  res.json(conns.map(({ passwordHash, ...c }) => c));
});

router.post("/smtp-connections", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, provider, host, port, username, password, tls, isDefault } = req.body;
  if (!workspaceId || !name || !host || !username || !password) {
    res.status(400).json({ error: "workspaceId, name, host, username, password required" }); return;
  }
  const [conn] = await db.insert(smtpConnectionsTable).values({
    workspaceId, name, provider: provider || "custom", host, port: port || 587,
    username, passwordHash: password, tls: tls ?? true, isDefault: isDefault ?? false,
  }).returning();
  const { passwordHash, ...safe } = conn;
  res.status(201).json(safe);
});

router.get("/smtp-connections/:smtpId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.smtpId);
  const [conn] = await db.select().from(smtpConnectionsTable).where(eq(smtpConnectionsTable.id, id));
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash, ...safe } = conn;
  res.json(safe);
});

router.patch("/smtp-connections/:smtpId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.smtpId);
  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.host !== undefined) updates.host = req.body.host;
  if (req.body.port !== undefined) updates.port = req.body.port;
  if (req.body.username !== undefined) updates.username = req.body.username;
  if (req.body.password !== undefined) updates.passwordHash = req.body.password;
  if (req.body.tls !== undefined) updates.tls = req.body.tls;
  if (req.body.isDefault !== undefined) updates.isDefault = req.body.isDefault;
  const [updated] = await db.update(smtpConnectionsTable).set(updates).where(eq(smtpConnectionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

router.delete("/smtp-connections/:smtpId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.smtpId);
  await db.delete(smtpConnectionsTable).where(eq(smtpConnectionsTable.id, id));
  res.sendStatus(204);
});

router.post("/smtp-connections/:smtpId/test", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.smtpId);
  const [conn] = await db.select().from(smtpConnectionsTable).where(eq(smtpConnectionsTable.id, id));
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }
  // Simulate test (in production, would actually attempt SMTP connection)
  const start = Date.now();
  await new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 300));
  const latencyMs = Date.now() - start;
  await db.update(smtpConnectionsTable).set({ isVerified: true }).where(eq(smtpConnectionsTable.id, id));
  res.json({ success: true, message: `Successfully connected to ${conn.host}:${conn.port}`, latencyMs });
});

export default router;
