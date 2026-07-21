import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListMembers, useListSmtpConnections, useListApiKeys } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import {
  Settings, Users, Server, Key, CreditCard, Plus, Trash2, CheckCircle2,
  Loader2, ExternalLink, AlertCircle, Mail, Zap, ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getApiUrl } from '@/lib/api';

// ─── Tabs ────────────────────────────────────────────────────────────────────
const Tabs = TabsPrimitive.Root
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
  ))
TabsList.displayName = TabsPrimitive.List.displayName
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
  ))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
  ))
TabsContent.displayName = TabsPrimitive.Content.displayName

// ─── Provider definitions ─────────────────────────────────────────────────────

interface ProviderDef {
  id: string;
  name: string;
  tagline: string;
  freeLabel: string;
  freeNote: string;
  color: string;
  host: string;
  port: number;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  setupUrl: string;
  steps: string[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "brevo",
    name: "Brevo",
    tagline: "Best free newsletter tier",
    freeLabel: "300 emails/day free",
    freeNote: "9,000/month — no credit card required",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    host: "smtp-relay.brevo.com",
    port: 587,
    usernameLabel: "Login email",
    usernamePlaceholder: "you@example.com",
    passwordLabel: "SMTP key (not your password)",
    passwordPlaceholder: "xsmtpsib-...",
    setupUrl: "https://app.brevo.com/settings/keys/smtp",
    steps: [
      "Sign up at brevo.com (free, no card needed)",
      "Go to Account → SMTP & API → SMTP tab",
      "Click \"Generate a new SMTP key\"",
      "Copy the key — that's your password below",
      "Username is your Brevo login email",
    ],
  },
  {
    id: "resend",
    name: "Resend",
    tagline: "Developer-first, great deliverability",
    freeLabel: "3,000 emails/month free",
    freeNote: "100/day limit on free tier",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
    host: "smtp.resend.com",
    port: 587,
    usernameLabel: "Username (always \"resend\")",
    usernamePlaceholder: "resend",
    passwordLabel: "API key",
    passwordPlaceholder: "re_...",
    setupUrl: "https://resend.com/api-keys",
    steps: [
      "Sign up at resend.com",
      "Go to API Keys → Create API Key",
      "Username is literally the word: resend",
      "Password is your API key (starts with re_)",
      "Verify your sending domain in Resend for best results",
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    tagline: "Use your existing Google account",
    freeLabel: "500 emails/day free",
    freeNote: "Works with personal Gmail or Google Workspace",
    color: "bg-red-50 border-red-200 hover:border-red-400",
    host: "smtp.gmail.com",
    port: 587,
    usernameLabel: "Gmail address",
    usernamePlaceholder: "you@gmail.com",
    passwordLabel: "App Password (not your Google password)",
    passwordPlaceholder: "xxxx xxxx xxxx xxxx",
    setupUrl: "https://myaccount.google.com/apppasswords",
    steps: [
      "Enable 2-Step Verification on your Google account",
      "Go to myaccount.google.com → Security → App passwords",
      "Select app: Mail, device: Other, name: CampaignForge",
      "Copy the 16-character app password",
      "Use that as the password below (remove spaces)",
    ],
  },
  {
    id: "ses",
    name: "Amazon SES",
    tagline: "Virtually unlimited — $0.10 per 1,000 emails",
    freeLabel: "Unlimited sending",
    freeNote: "62K free/month from EC2 · $0.10/1K otherwise",
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 587,
    usernameLabel: "SMTP username (from AWS)",
    usernamePlaceholder: "AKIAxxxxxxxxxxxxxxxx",
    passwordLabel: "SMTP password (from AWS)",
    passwordPlaceholder: "BMxxxxxxxxxxxxxxxxxxxxxxxxx",
    setupUrl: "https://console.aws.amazon.com/ses/home#/smtp",
    steps: [
      "Sign in to AWS Console → Simple Email Service",
      "Go to Account dashboard → Create SMTP credentials",
      "Download the credentials CSV (username + password)",
      "Verify your sending domain or email address in SES",
      "Request production access to remove sandbox limits",
    ],
  },
  {
    id: "custom",
    name: "Custom SMTP",
    tagline: "Your own server or any other provider",
    freeLabel: "Unlimited",
    freeNote: "Works with any SMTP relay",
    color: "bg-gray-50 border-gray-200 hover:border-gray-400",
    host: "",
    port: 587,
    usernameLabel: "SMTP username",
    usernamePlaceholder: "username or email",
    passwordLabel: "SMTP password",
    passwordPlaceholder: "password",
    setupUrl: "",
    steps: [],
  },
];

// ─── Add Provider Dialog ──────────────────────────────────────────────────────

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
  onSaved: () => void;
}

function AddProviderDialog({ open, onClose, workspaceId, onSaved }: AddProviderDialogProps) {
  const [step, setStep] = useState<"pick" | "configure">("pick");
  const [provider, setProvider] = useState<ProviderDef | null>(null);
  const [form, setForm] = useState({ name: "", host: "", port: 587, username: "", password: "", testEmail: "" });
  const [status, setStatus] = useState<"idle" | "testing" | "saving" | "success" | "error">("idle");
  const [result, setResult] = useState<{ message: string; hint?: string } | null>(null);

  function pickProvider(p: ProviderDef) {
    setProvider(p);
    setForm(f => ({ ...f, name: p.name, host: p.host, port: p.port, username: p.id === "resend" ? "resend" : f.username }));
    setStep("configure");
    setStatus("idle");
    setResult(null);
  }

  function back() { setStep("pick"); setProvider(null); setStatus("idle"); setResult(null); }

  async function handleTest() {
    setStatus("testing"); setResult(null);
    try {
      const res = await fetch(getApiUrl("/api/smtp-connections/test-credentials"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: form.host, port: form.port, username: form.username, password: form.password, testEmail: form.testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setResult({ message: `Connected in ${data.latencyMs}ms${form.testEmail ? ` — test email sent to ${form.testEmail}` : ""}` });
      } else {
        setStatus("error");
        setResult({ message: data.message, hint: data.hint });
      }
    } catch {
      setStatus("error");
      setResult({ message: "Network error — check console" });
    }
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch(getApiUrl("/api/smtp-connections"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name || provider?.name,
          provider: provider?.id || "custom",
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
          tls: true,
          isDefault: true,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSaved();
      onClose();
    } catch (err) {
      setStatus("error");
      setResult({ message: (err as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        {step === "pick" ? (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Add Email Provider</h2>
              <p className="text-sm text-muted-foreground mt-1">
                listmonk handles the sending — pick an SMTP relay to deliver your campaigns.
              </p>
            </div>

            <div className="space-y-3">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickProvider(p)}
                  className={cn(
                    "w-full text-left flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    p.color
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.name}</span>
                      <Badge variant="secondary" className="text-xs font-medium">{p.freeLabel}</Badge>
                      {p.id === "ses" && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          <Zap className="w-3 h-3 mr-1" />Unlimited
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.tagline} · {p.freeNote}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Truly unlimited for free?</strong> Run your own SMTP server on{" "}
                <a href="https://www.oracle.com/cloud/free/" target="_blank" rel="noreferrer" className="underline">
                  Oracle Cloud Free Tier
                </a>{" "}
                (Postal or Mailu). Then use "Custom SMTP" above.
                Amazon SES at $0.10/1,000 is the next best option.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              ← Back to providers
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>{provider?.name}</span>
                <Badge variant="secondary">{provider?.freeLabel}</Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{provider?.freeNote}</p>
            </div>

            {/* Setup steps */}
            {provider?.steps && provider.steps.length > 0 && (
              <div className="mb-6 p-4 bg-muted/40 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Setup steps</span>
                  {provider.setupUrl && (
                    <a href={provider.setupUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      Open {provider.name} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <ol className="space-y-1.5">
                  {provider.steps.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-muted-foreground font-mono">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {provider?.id === "custom" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium">SMTP Host</label>
                    <Input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Port</label>
                    <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) }))} />
                  </div>
                </div>
              )}
              {provider?.id !== "custom" && (
                <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded">
                  <strong>Host:</strong> {provider?.host} &nbsp;·&nbsp; <strong>Port:</strong> {provider?.port} &nbsp;·&nbsp; TLS/STARTTLS
                </p>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">{provider?.usernameLabel || "Username"}</label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder={provider?.usernamePlaceholder}
                  readOnly={provider?.id === "resend"}
                  className={provider?.id === "resend" ? "bg-muted" : ""}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{provider?.passwordLabel || "Password"}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={provider?.passwordPlaceholder}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Send test email to (optional)
                </label>
                <Input
                  type="email"
                  value={form.testEmail}
                  onChange={e => setForm(f => ({ ...f, testEmail: e.target.value }))}
                  placeholder="your@email.com"
                />
                <p className="text-xs text-muted-foreground">If filled, a real test email will be delivered to verify end-to-end sending.</p>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={cn(
                "mt-4 p-3 rounded-lg border text-sm",
                status === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
              )}>
                <div className="flex items-start gap-2">
                  {status === "success"
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-medium">{result.message}</p>
                    {result.hint && <p className="mt-1 text-xs">{result.hint}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={status === "testing" || status === "saving" || !form.username || !form.password || (provider?.id === "custom" && !form.host)}
                className="flex-1"
              >
                {status === "testing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing…</> : "Test Connection"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={status === "saving" || !form.username || !form.password || (provider?.id === "custom" && !form.host)}
                className="flex-1"
              >
                {status === "saving" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save & Activate"}
              </Button>
            </div>
            {status === "success" && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Connection verified ✓ — click "Save & Activate" to push to listmonk and start sending.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { workspaceId, activeWorkspace } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});

  const { data: members } = useListMembers(workspaceId!, { query: { enabled: !!workspaceId } as any });
  const { data: smtp, refetch: refetchSmtp } = useListSmtpConnections({ workspaceId: workspaceId! }, { query: { enabled: !!workspaceId } as any });
  const { data: apiKeys } = useListApiKeys({ workspaceId: workspaceId! }, { query: { enabled: !!workspaceId } as any });

  async function handleTest(id: number) {
    setTestingId(id);
    try {
      const res = await fetch(getApiUrl(`/api/smtp-connections/${id}/test`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setTestResults(r => ({ ...r, [id]: { success: data.success, message: data.message } }));
      if (data.success) refetchSmtp();
    } catch {
      setTestResults(r => ({ ...r, [id]: { success: false, message: "Network error" } }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage preferences, team members, and integrations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="general" className="gap-2 px-4 py-2"><Settings className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="team" className="gap-2 px-4 py-2"><Users className="w-4 h-4" /> Team</TabsTrigger>
          <TabsTrigger value="smtp" className="gap-2 px-4 py-2"><Server className="w-4 h-4" /> SMTP & Sending</TabsTrigger>
          <TabsTrigger value="api" className="gap-2 px-4 py-2"><Key className="w-4 h-4" /> API Keys</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 px-4 py-2"><CreditCard className="w-4 h-4" /> Billing</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Profile</CardTitle>
              <CardDescription>Basic information about this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">Workspace Name</label>
                <Input defaultValue={activeWorkspace?.name || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default From Name</label>
                  <Input defaultValue={activeWorkspace?.fromName || ''} placeholder="e.g. Acme Team" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default From Email</label>
                  <Input defaultValue={activeWorkspace?.fromEmail || ''} placeholder="hello@acme.com" />
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">Timezone</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                </select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team ── */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to this workspace.</CardDescription>
              </div>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Invite Member</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium text-left">User</th>
                      <th className="px-4 py-3 font-medium text-left">Role</th>
                      <th className="px-4 py-3 font-medium text-left">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members && members.length > 0 ? (
                      members.map(member => (
                        <tr key={member.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{member.email}</div>
                            <div className="text-xs text-muted-foreground">{member.firstName} {member.lastName}</div>
                          </td>
                          <td className="px-4 py-3 capitalize">{member.role.replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            <Badge variant={member.status === 'active' ? 'success' : 'outline'}>{member.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No members found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SMTP & Sending ── */}
        <TabsContent value="smtp">
          <div className="space-y-4">
            {/* How it works banner */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Powered by listmonk</strong> — your self-hosted sending engine with no subscriber or email limits.
                The provider below is the SMTP relay listmonk uses to deliver messages.
                You can rotate between providers for higher daily capacity.
              </div>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Email Providers</CardTitle>
                  <CardDescription>SMTP connections used to deliver your campaigns.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Provider
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {smtp && smtp.length > 0 ? (
                    smtp.map(conn => {
                      const tr = testResults[conn.id];
                      return (
                        <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                              <Server className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                {conn.name}
                                {conn.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                                {conn.isVerified && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Verified</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {conn.provider.replace('_', ' ')} · {conn.host}:{conn.port}
                              </div>
                              {tr && (
                                <div className={cn("text-xs mt-1", tr.success ? "text-emerald-600" : "text-red-600")}>
                                  {tr.success ? "✓ " : "✗ "}{tr.message}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={testingId === conn.id}
                              onClick={() => handleTest(conn.id)}
                            >
                              {testingId === conn.id
                                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing</>
                                : conn.isVerified ? <><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />Re-test</> : "Test"}
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                      <Server className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-sm mb-1">No email provider connected</p>
                      <p className="text-muted-foreground text-xs mb-4">
                        Add a provider to start sending campaigns. Brevo is free and takes 2 minutes.
                      </p>
                      <Button onClick={() => setAddOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Your First Provider
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Provider Comparison</CardTitle>
                <CardDescription>Free tiers available for all options below.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-2 font-medium">Provider</th>
                        <th className="text-left pb-2 font-medium">Free allowance</th>
                        <th className="text-left pb-2 font-medium">Paid / overage</th>
                        <th className="text-left pb-2 font-medium">Best for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2 font-medium">Brevo</td>
                        <td className="py-2">300/day · 9K/mo</td>
                        <td className="py-2">From $9/mo unlimited</td>
                        <td className="py-2 text-muted-foreground">Getting started</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Resend</td>
                        <td className="py-2">3,000/mo · 100/day</td>
                        <td className="py-2">$20/mo for 50K</td>
                        <td className="py-2 text-muted-foreground">Devs, transactional</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Gmail</td>
                        <td className="py-2">500/day</td>
                        <td className="py-2">Google Workspace $6/mo</td>
                        <td className="py-2 text-muted-foreground">Personal use</td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="py-2 font-medium">Amazon SES</td>
                        <td className="py-2">62K/mo from EC2</td>
                        <td className="py-2 font-medium text-emerald-700">$0.10 per 1,000 emails</td>
                        <td className="py-2 text-muted-foreground">High volume ✦ Recommended</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Your own server</td>
                        <td className="py-2 font-medium">Unlimited</td>
                        <td className="py-2">VPS cost (~$5/mo)</td>
                        <td className="py-2 text-muted-foreground">Full control</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {workspaceId && (
            <AddProviderDialog
              open={addOpen}
              onClose={() => setAddOpen(false)}
              workspaceId={workspaceId}
              onSaved={() => { refetchSmtp(); setAddOpen(false); }}
            />
          )}
        </TabsContent>

        {/* ── API Keys ── */}
        <TabsContent value="api">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for programmatic access.</CardDescription>
              </div>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Create Key</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium text-left">Name</th>
                      <th className="px-4 py-3 font-medium text-left">Prefix</th>
                      <th className="px-4 py-3 font-medium text-left">Created</th>
                      <th className="px-4 py-3 font-medium text-left">Last Used</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {apiKeys && apiKeys.length > 0 ? (
                      apiKeys.map(key => (
                        <tr key={key.id}>
                          <td className="px-4 py-3 font-medium">{key.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{key.prefix}••••••••</td>
                          <td className="px-4 py-3 text-muted-foreground">{format(parseISO(key.createdAt), 'MMM d, yyyy')}</td>
                          <td className="px-4 py-3 text-muted-foreground">{key.lastUsedAt ? format(parseISO(key.lastUsedAt), 'MMM d, yyyy') : 'Never'}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Revoke</Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No API keys found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing ── */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan: Pro</CardTitle>
              <CardDescription>You are currently on the Pro plan, billed monthly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="bg-muted/30 p-6 rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-3xl font-bold">$49<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <Button variant="outline">Manage Billing</Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Subscribers</span>
                        <span className="text-muted-foreground">12,450 / 50,000</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/4 rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Emails Sent (This Month)</span>
                        <span className="text-muted-foreground">84,200 / 500,000</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-1/6 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
