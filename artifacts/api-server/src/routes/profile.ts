import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string, email: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ clerkId, email }).returning();
  }
  return user;
}

router.get("/profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const email = (req as any).auth?.sessionClaims?.email as string ?? "";
  const user = await getOrCreateUser(userId, email);

  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    createdAt: user.createdAt,
  });
});

router.patch("/profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { firstName, lastName, timezone } = req.body;
  const email = (req as any).auth?.sessionClaims?.email as string ?? "";
  let user = await getOrCreateUser(userId, email);

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (timezone !== undefined) updates.timezone = timezone;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkId, userId)).returning();
  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    avatarUrl: updated.avatarUrl,
    timezone: updated.timezone,
    createdAt: updated.createdAt,
  });
});

export default router;
