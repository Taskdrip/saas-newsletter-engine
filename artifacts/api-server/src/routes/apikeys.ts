import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { randomBytes, createHash } from "crypto";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/api-keys", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const keys = workspaceId
    ? await db.select().from(apiKeysTable).where(eq(apiKeysTable.workspaceId, workspaceId))
    : await db.select().from(apiKeysTable);
  // Never return hash
  res.json(keys.map(({ keyHash, ...k }) => k));
});

router.post("/api-keys", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { workspaceId, name, scopes, expiresAt } = req.body;
  if (!workspaceId || !name) { res.status(400).json({ error: "workspaceId and name required" }); return; }

  const rawKey = `cf_${randomBytes(32).toString("hex")}`;
  const prefix = rawKey.substring(0, 10);
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const [key] = await db.insert(apiKeysTable).values({
    workspaceId, name, prefix, keyHash, scopes: scopes || [],
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  }).returning();

  res.status(201).json({ id: key.id, name: key.name, key: rawKey, prefix: key.prefix, createdAt: key.createdAt });
});

router.delete("/api-keys/:keyId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseId(req.params.keyId);
  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));
  res.sendStatus(204);
});

export default router;
