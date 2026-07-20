/**
 * Seed script - run with: npx tsx src/seed.ts
 * Seeds the DB with demo data for a fresh install.
 */
import {
  db,
  usersTable,
  organizationsTable,
  orgMembershipsTable,
  workspacesTable,
  workspaceMembersTable,
  subscribersTable,
  subscriberListMembershipsTable,
  listsTable,
  segmentsTable,
  tagsTable,
  campaignsTable,
  campaignStatsTable,
  templatesTable,
  automationsTable,
  smtpConnectionsTable,
  formsTable,
  websitesTable,
  subscriptionsTable,
  activityLogsTable,
} from "@workspace/db";

async function seed() {
  console.log("🌱 Seeding database...");

  // User
  const [user] = await db
    .insert(usersTable)
    .values({
      clerkId: "demo-user",
      email: "demo@campaignforge.io",
      firstName: "Alex",
      lastName: "Rivera",
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log("Data already seeded.");
    return;
  }

  // Organization
  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: "Forge Labs",
      slug: "forge-labs",
      ownerId: user.id,
      plan: "pro",
    })
    .returning();

  await db
    .insert(orgMembershipsTable)
    .values({ orgId: org.id, userId: user.id, role: "owner" });

  // Subscription
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await db.insert(subscriptionsTable).values({
    orgId: org.id,
    planId: "pro",
    planName: "Pro",
    status: "active",
    currentPeriodEnd: periodEnd,
    subscribersUsed: 4200,
    emailsSentThisMonth: 87000,
  });

  // Workspace
  const [ws] = await db
    .insert(workspacesTable)
    .values({
      orgId: org.id,
      name: "Forge Labs",
      fromName: "Alex at Forge Labs",
      fromEmail: "alex@forgelabs.io",
      replyToEmail: "support@forgelabs.io",
      timezone: "America/New_York",
    })
    .returning();

  // Team members
  await db.insert(workspaceMembersTable).values([
    { workspaceId: ws.id, userId: user.id, email: "alex@forgelabs.io", firstName: "Alex", lastName: "Rivera", role: "owner", status: "active" },
    { workspaceId: ws.id, email: "sarah@forgelabs.io", firstName: "Sarah", lastName: "Chen", role: "editor", status: "active" },
    { workspaceId: ws.id, email: "mike@forgelabs.io", firstName: "Mike", lastName: "Thompson", role: "viewer", status: "active" },
    { workspaceId: ws.id, email: "jess@agency.co", firstName: "Jessica", lastName: "Kim", role: "viewer", status: "invited" },
  ]);

  // Tags
  const [tagVip, tagCustomer, tagTrial] = await db
    .insert(tagsTable)
    .values([
      { workspaceId: ws.id, name: "VIP", color: "#f97316" },
      { workspaceId: ws.id, name: "Customer", color: "#22c55e" },
      { workspaceId: ws.id, name: "Trial", color: "#3b82f6" },
      { workspaceId: ws.id, name: "Churned", color: "#ef4444" },
    ])
    .returning();

  // Lists
  const [list1, list2, list3] = await db
    .insert(listsTable)
    .values([
      { workspaceId: ws.id, name: "Newsletter Subscribers", description: "Main newsletter list", type: "static", isPublic: true },
      { workspaceId: ws.id, name: "Product Users", description: "Paying customers", type: "static", isPublic: false },
      { workspaceId: ws.id, name: "Trial Users", description: "Free trial signups", type: "static", isPublic: false },
      { workspaceId: ws.id, name: "Webinar Attendees", description: "Past webinar participants", type: "static", isPublic: false },
    ])
    .returning();

  // Segments
  await db.insert(segmentsTable).values([
    { workspaceId: ws.id, name: "High Openers", description: "Subscribers who open >50% of emails", conditions: { rules: [{ field: "open_rate", operator: "gt", value: 0.5 }] } },
    { workspaceId: ws.id, name: "Inactive 30d", description: "No opens in the past 30 days", conditions: { rules: [{ field: "last_opened", operator: "older_than", value: "30d" }] } },
    { workspaceId: ws.id, name: "New Subscribers", description: "Joined in last 7 days", conditions: { rules: [{ field: "created_at", operator: "newer_than", value: "7d" }] } },
  ]);

  // Subscribers
  const subsData = [
    { email: "emma.wilson@gmail.com", firstName: "Emma", lastName: "Wilson", status: "active", tags: ["VIP", "Customer"] },
    { email: "james.chen@techco.io", firstName: "James", lastName: "Chen", status: "active", tags: ["Customer"] },
    { email: "sophia.rodriguez@design.co", firstName: "Sophia", lastName: "Rodriguez", status: "active", tags: ["Trial"] },
    { email: "noah.johnson@startup.io", firstName: "Noah", lastName: "Johnson", status: "active", tags: ["Customer", "VIP"] },
    { email: "olivia.martinez@media.com", firstName: "Olivia", lastName: "Martinez", status: "active", tags: [] },
    { email: "liam.anderson@corp.io", firstName: "Liam", lastName: "Anderson", status: "active", tags: ["Customer"] },
    { email: "ava.taylor@mail.com", firstName: "Ava", lastName: "Taylor", status: "unsubscribed", tags: [] },
    { email: "mason.thomas@enterprise.com", firstName: "Mason", lastName: "Thomas", status: "active", tags: ["VIP"] },
    { email: "isabella.jackson@co.io", firstName: "Isabella", lastName: "Jackson", status: "active", tags: ["Trial"] },
    { email: "ethan.white@mail.net", firstName: "Ethan", lastName: "White", status: "bounced", tags: [] },
    { email: "mia.harris@startup.com", firstName: "Mia", lastName: "Harris", status: "active", tags: ["Customer"] },
    { email: "alexander.martin@tech.io", firstName: "Alexander", lastName: "Martin", status: "active", tags: [] },
    { email: "charlotte.garcia@gmail.com", firstName: "Charlotte", lastName: "Garcia", status: "active", tags: ["Trial"] },
    { email: "benjamin.clark@agency.io", firstName: "Benjamin", lastName: "Clark", status: "active", tags: [] },
    { email: "amelia.lewis@design.co", firstName: "Amelia", lastName: "Lewis", status: "active", tags: ["VIP", "Customer"] },
  ];

  const subs = await db
    .insert(subscribersTable)
    .values(subsData.map(s => ({ ...s, workspaceId: ws.id })))
    .returning();

  // List memberships
  const memberships = [];
  for (const sub of subs) {
    memberships.push({ subscriberId: sub.id, listId: list1.id });
    if (sub.status === "active") {
      memberships.push({ subscriberId: sub.id, listId: Math.random() > 0.5 ? list2.id : list3.id });
    }
  }
  await db.insert(subscriberListMembershipsTable).values(memberships).onConflictDoNothing();

  // Templates
  await db.insert(templatesTable).values([
    { workspaceId: ws.id, name: "Monthly Newsletter", category: "newsletter", isGlobal: false, description: "Clean newsletter template with header, body, and footer" },
    { workspaceId: ws.id, name: "Product Announcement", category: "product", isGlobal: false, description: "Bold announcement layout for new features or launches" },
    { workspaceId: ws.id, name: "Welcome Email", category: "onboarding", isGlobal: false, description: "Warm welcome for new subscribers" },
    { workspaceId: ws.id, name: "Weekly Digest", category: "newsletter", isGlobal: false, description: "Weekly roundup with links and summaries" },
    { name: "Plain Text", category: "basic", isGlobal: true, description: "Minimal plain text template" },
    { name: "Promotional", category: "ecommerce", isGlobal: true, description: "Sales and promotional template" },
  ]);

  // Campaigns
  const now = new Date();
  const campaigns = await db
    .insert(campaignsTable)
    .values([
      {
        workspaceId: ws.id, name: "July Product Update", subject: "Big changes are coming to Forge Labs 🚀",
        fromName: "Alex at Forge Labs", fromEmail: "alex@forgelabs.io", type: "regular",
        status: "finished", sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        totalRecipients: 4217, listIds: [list1.id],
      },
      {
        workspaceId: ws.id, name: "Summer Sale - 30% Off", subject: "Limited time: 30% off all plans this week",
        fromName: "Forge Labs", fromEmail: "offers@forgelabs.io", type: "regular",
        status: "finished", sentAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        totalRecipients: 3891, listIds: [list1.id, list2.id],
      },
      {
        workspaceId: ws.id, name: "June Newsletter", subject: "What we shipped in June",
        fromName: "Alex at Forge Labs", fromEmail: "alex@forgelabs.io", type: "regular",
        status: "finished", sentAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        totalRecipients: 4103, listIds: [list1.id],
      },
      {
        workspaceId: ws.id, name: "New Feature: Analytics V2", subject: "Your emails, now with deeper insights",
        fromName: "Alex at Forge Labs", fromEmail: "alex@forgelabs.io", type: "regular",
        status: "scheduled", scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        totalRecipients: 0, listIds: [list1.id, list2.id],
      },
      {
        workspaceId: ws.id, name: "Q3 Customer Webinar Invite", subject: "Join us live — Q3 product roadmap preview",
        fromName: "Forge Labs Team", fromEmail: "events@forgelabs.io", type: "regular",
        status: "draft", totalRecipients: 0, listIds: [list2.id],
      },
    ])
    .returning();

  // Campaign stats
  await db.insert(campaignStatsTable).values([
    {
      campaignId: campaigns[0].id, sent: 4217, delivered: 4130, opened: 1435, clicked: 284,
      bounced: 87, unsubscribed: 12, complained: 2,
      opensByDevice: { Desktop: 62, Mobile: 31, Tablet: 7 },
      opensByCountry: { "United States": 45, "United Kingdom": 18, Canada: 12, Australia: 8, Germany: 6, Other: 11 },
    },
    {
      campaignId: campaigns[1].id, sent: 3891, delivered: 3810, opened: 1171, clicked: 423,
      bounced: 81, unsubscribed: 21, complained: 5,
      opensByDevice: { Desktop: 58, Mobile: 35, Tablet: 7 },
      opensByCountry: { "United States": 48, "United Kingdom": 16, Canada: 10, Australia: 9, Germany: 8, Other: 9 },
    },
    {
      campaignId: campaigns[2].id, sent: 4103, delivered: 4012, opened: 1192, clicked: 198,
      bounced: 91, unsubscribed: 8, complained: 1,
      opensByDevice: { Desktop: 65, Mobile: 28, Tablet: 7 },
      opensByCountry: { "United States": 50, "United Kingdom": 15, Canada: 11, Australia: 7, Germany: 7, Other: 10 },
    },
    { campaignId: campaigns[3].id, sent: 0, delivered: 0, opened: 0, clicked: 0 },
    { campaignId: campaigns[4].id, sent: 0, delivered: 0, opened: 0, clicked: 0 },
  ]);

  // Automations
  await db.insert(automationsTable).values([
    {
      workspaceId: ws.id, name: "Welcome Series", trigger: "signup", status: "active",
      enrolledCount: 342, completedCount: 287,
      steps: [
        { type: "email", delay: "0", subject: "Welcome to Forge Labs!" },
        { type: "wait", delay: "3d" },
        { type: "email", delay: "0", subject: "Getting started guide" },
        { type: "wait", delay: "7d" },
        { type: "email", delay: "0", subject: "How are things going?" },
      ],
    },
    {
      workspaceId: ws.id, name: "Trial Expiry Reminder", trigger: "trial_expiring", status: "active",
      enrolledCount: 89, completedCount: 71,
      steps: [
        { type: "email", delay: "0", subject: "Your trial expires in 3 days" },
        { type: "wait", delay: "2d" },
        { type: "email", delay: "0", subject: "Last chance — upgrade today" },
      ],
    },
    {
      workspaceId: ws.id, name: "Win-Back Campaign", trigger: "inactive", status: "inactive",
      enrolledCount: 0, completedCount: 0,
      steps: [
        { type: "email", delay: "0", subject: "We miss you — here's 20% off" },
        { type: "wait", delay: "7d" },
        { type: "condition", delay: "0", field: "opened" },
      ],
    },
  ]);

  // SMTP
  await db.insert(smtpConnectionsTable).values([
    {
      workspaceId: ws.id, name: "Postmark Production", provider: "postmark",
      host: "smtp.postmarkapp.com", port: 587,
      username: "api-key-placeholder", passwordHash: "hashed-password",
      tls: true, isDefault: true, isVerified: true,
    },
  ]);

  // Forms
  await db.insert(formsTable).values([
    {
      workspaceId: ws.id, name: "Blog Sidebar Opt-in", type: "embedded", status: "active",
      listIds: [list1.id], submissionCount: 847,
      embedCode: '<script src="https://cdn.campaignforge.io/forms/abc123.js" async></script>',
    },
    {
      workspaceId: ws.id, name: "Exit Intent Popup", type: "popup", status: "active",
      listIds: [list1.id], submissionCount: 312,
      embedCode: '<script src="https://cdn.campaignforge.io/forms/def456.js" async></script>',
    },
  ]);

  // Websites
  await db.insert(websitesTable).values([
    {
      workspaceId: ws.id, name: "Forge Labs Blog", url: "https://blog.forgelabs.io",
      status: "verified", isVerified: true, pageviewsLast30d: 24800,
      trackingScript: '<!-- CampaignForge -->\n<script async src="https://cdn.campaignforge.io/track.js" data-site="abc123"></script>',
    },
  ]);

  // Activity log
  await db.insert(activityLogsTable).values([
    { workspaceId: ws.id, type: "campaign_sent", description: "Campaign sent: July Product Update", campaignName: "July Product Update" },
    { workspaceId: ws.id, type: "subscriber_added", description: "New subscriber: emma.wilson@gmail.com", subscriberEmail: "emma.wilson@gmail.com" },
    { workspaceId: ws.id, type: "campaign_sent", description: "Campaign sent: Summer Sale - 30% Off", campaignName: "Summer Sale - 30% Off" },
    { workspaceId: ws.id, type: "subscriber_added", description: "New subscriber: james.chen@techco.io", subscriberEmail: "james.chen@techco.io" },
    { workspaceId: ws.id, type: "automation_triggered", description: "Automation triggered: Welcome Series (5 new enrollments)" },
    { workspaceId: ws.id, type: "campaign_sent", description: "Campaign sent: June Newsletter", campaignName: "June Newsletter" },
  ]);

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
