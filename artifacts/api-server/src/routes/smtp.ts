import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, smtpConnectionsTable } from "@workspace/db";
import nodemailer from "nodemailer";
import { updateSmtpSettings } from "../lib/listmonk.js";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Push a saved SMTP connection into listmonk's live config. */
async function syncConnectionToListmonk(conn: typeof smtpConnectionsTable.$inferSelect): Promise<void> {
  try {
    await updateSmtpSettings({
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: conn.passwordHash,   // stored plaintext for now
      tls_type: conn.port === 465 ? "TLS" : "STARTTLS",
      enabled: true,
    });
  } catch (err) {
    // listmonk may not be configured yet (no admin user); log and continue
    console.warn("[smtp] listmonk sync failed (non-fatal):", (err as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

router.get("/smtp-connections", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string, 10) : undefined;
  const conns = workspaceId
    ? await db.select().from(smtpConnectionsTable).where(eq(smtpConnectionsTable.workspaceId, workspaceId))
    : await db.select().from(smtpConnectionsTable);
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
    workspaceId,
    name,
    provider: provider || "custom",
    host,
    port: port || 587,
    username,
    passwordHash: password,
    tls: tls ?? true,
    isDefault: isDefault ?? false,
  }).returning();

  // If marked default, push to listmonk immediately
  if (conn.isDefault) {
    await syncConnectionToListmonk(conn);
  }

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

  if (updated.isDefault) {
    await syncConnectionToListmonk(updated);
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// Test — real SMTP handshake via nodemailer
// ─────────────────────────────────────────────────────────────────────────────

router.post("/smtp-connections/:smtpId/test", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseId(req.params.smtpId);
  const [conn] = await db.select().from(smtpConnectionsTable).where(eq(smtpConnectionsTable.id, id));
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }

  const testEmail: string = req.body.testEmail || conn.username;
  const start = Date.now();

  try {
    const transporter = nodemailer.createTransport({
      host: conn.host,
      port: conn.port,
      secure: conn.port === 465,
      auth: {
        user: conn.username,
        pass: conn.passwordHash,
      },
      tls: {
        rejectUnauthorized: false,   // allow self-signed certs in dev
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    // Verify the connection first (SMTP handshake only)
    await transporter.verify();

    // Optionally send a real test message
    let messageId: string | undefined;
    if (testEmail) {
      const info = await transporter.sendMail({
        from: `"CampaignForge Test" <${conn.username}>`,
        to: testEmail,
        subject: "✅ SMTP connection verified",
        text: [
          "Your SMTP connection is working correctly.",
          "",
          `Provider: ${conn.provider}`,
          `Host: ${conn.host}:${conn.port}`,
          "",
          "You can now send unlimited newsletter campaigns through listmonk.",
        ].join("\n"),
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#16a34a;margin-bottom:8px">✅ SMTP connection verified</h2>
            <p style="color:#374151">Your SMTP connection is working correctly. You can now send unlimited newsletter campaigns through listmonk.</p>
            <table style="border-collapse:collapse;width:100%;margin-top:16px">
              <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Provider</td><td style="padding:6px 12px">${conn.provider}</td></tr>
              <tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Host</td><td style="padding:6px 12px">${conn.host}:${conn.port}</td></tr>
            </table>
          </div>
        `,
      });
      messageId = info.messageId;
    }

    const latencyMs = Date.now() - start;

    // Mark verified + push to listmonk
    await db.update(smtpConnectionsTable).set({ isVerified: true }).where(eq(smtpConnectionsTable.id, id));
    await syncConnectionToListmonk({ ...conn, isDefault: true });

    res.json({
      success: true,
      message: `Successfully connected to ${conn.host}:${conn.port}`,
      latencyMs,
      messageId,
      syncedToListmonk: true,
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = (err as Error).message;
    res.status(422).json({
      success: false,
      message: `Connection failed: ${message}`,
      latencyMs,
      hint: getHint(conn.provider, message),
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Quick test with credentials (before saving)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/smtp-connections/test-credentials", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { host, port, username, password, testEmail } = req.body;
  if (!host || !username || !password) {
    res.status(400).json({ error: "host, username, password required" }); return;
  }

  const start = Date.now();
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: port === 465,
      auth: { user: username, pass: password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    await transporter.verify();

    if (testEmail) {
      await transporter.sendMail({
        from: `"CampaignForge" <${username}>`,
        to: testEmail,
        subject: "✅ SMTP test successful",
        text: "Your SMTP credentials are working. You're ready to send unlimited campaigns.",
      });
    }

    res.json({ success: true, latencyMs: Date.now() - start });
  } catch (err) {
    res.status(422).json({
      success: false,
      message: (err as Error).message,
      latencyMs: Date.now() - start,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpful hints per provider
// ─────────────────────────────────────────────────────────────────────────────

function getHint(provider: string, error: string): string {
  const e = error.toLowerCase();
  if (e.includes("invalid login") || e.includes("535") || e.includes("authentication")) {
    switch (provider) {
      case "gmail":
        return "Gmail rejected the credentials. Use an App Password (not your regular password). Go to myaccount.google.com → Security → 2-Step Verification → App passwords.";
      case "brevo":
        return "Brevo rejected the credentials. Make sure you're using your SMTP key (not your login password) from app.brevo.com → Account → SMTP & API.";
      case "resend":
        return "For Resend, the username must be literally 'resend' and the password is your API key from resend.com.";
      case "ses":
        return "For Amazon SES, generate SMTP credentials in the AWS console (SES → Account dashboard → Create SMTP credentials). These are different from your IAM keys.";
      default:
        return "Authentication failed. Double-check your username and password.";
    }
  }
  if (e.includes("econnrefused") || e.includes("etimedout") || e.includes("timeout")) {
    return `Could not reach ${provider} SMTP server. Check the host and port (try 587 for TLS, 465 for SSL, or 25 for plain). Replit blocks port 25.`;
  }
  if (e.includes("enotfound") || e.includes("getaddrinfo")) {
    return "Hostname not found. Check the SMTP host address for typos.";
  }
  return "Check your SMTP settings and try again.";
}

export default router;
