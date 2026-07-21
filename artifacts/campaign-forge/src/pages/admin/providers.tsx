import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Server, Plus, Trash2, Edit2, RotateCcw, TestTube,
  CheckCircle, AlertTriangle, ExternalLink, Info, Zap, ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Provider {
  id: number;
  name: string;
  providerType: string;
  isActive: boolean;
  priority: number;
  fromEmail: string;
  fromName: string;
  dailySent: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlySent: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  dailyUsedPct: number;
  monthlyUsedPct: number;
  hasApiKey: boolean;
}

interface ProviderInfo {
  label: string;
  freeDailyLimit: number;
  freeMonthlyLimit: number;
  signupUrl: string;
  apiKeyLabel: string;
  requiresSecret?: boolean;
  secretLabel?: string;
  notes: string;
}

const PROVIDER_TYPES = [
  "brevo", "resend", "mailersend", "mailjet",
  "sendgrid", "postmark", "elasticemail", "smtp2go",
];

export default function AdminProviders() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    name: "", providerType: "brevo", apiKey: "", apiSecret: "",
    fromEmail: "", fromName: "CampaignForge",
    dailyLimit: 300, monthlyLimit: 9000, priority: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-providers"],
    queryFn: () => apiRequest("/api/admin/email-providers"),
    refetchInterval: 60_000,
  });

  const providers: Provider[] = data?.providers ?? [];
  const providerInfo: Record<string, ProviderInfo> = data?.providerInfo ?? {};
  const info = providerInfo[form.providerType];

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("/api/admin/email-providers", { method: "POST", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-email-providers"] }); setDialogOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest(`/api/admin/email-providers/${id}`, { method: "PUT", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-email-providers"] }); setDialogOpen(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/email-providers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-email-providers"] }),
  });

  const resetQuotaMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/email-providers/${id}/reset-quota`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-email-providers"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/admin/email-providers/${id}`, { method: "PUT", body: { isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-email-providers"] }),
  });

  function resetForm() {
    setForm({ name: "", providerType: "brevo", apiKey: "", apiSecret: "", fromEmail: "", fromName: "CampaignForge", dailyLimit: 300, monthlyLimit: 9000, priority: 0 });
    setEditingId(null);
  }

  function openEdit(p: Provider) {
    setForm({ name: p.name, providerType: p.providerType, apiKey: "", apiSecret: "", fromEmail: p.fromEmail, fromName: p.fromName, dailyLimit: p.dailyLimit, monthlyLimit: p.monthlyLimit, priority: p.priority });
    setEditingId(p.id);
    setDialogOpen(true);
  }

  function onProviderTypeChange(val: string) {
    const i = providerInfo[val];
    setForm(f => ({
      ...f, providerType: val,
      dailyLimit: i?.freeDailyLimit ?? 100,
      monthlyLimit: i?.freeMonthlyLimit ?? 3000,
      name: f.name || (i?.label ?? val),
    }));
  }

  async function handleTest(id: number) {
    if (!testEmail) { alert("Enter a test email address first"); return; }
    setTestingId(id);
    setTestResult(null);
    try {
      const r = await apiRequest("/api/admin/email-providers/test", { method: "POST", body: { providerId: id, testEmail } });
      setTestResult({ success: true, message: `Sent via ${r.provider}` });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Failed" });
    } finally {
      setTestingId(null);
    }
  }

  const totalDailyCapacity = providers.filter(p => p.isActive).reduce((s, p) => s + p.dailyLimit, 0);
  const totalDailyRemaining = providers.filter(p => p.isActive).reduce((s, p) => s + p.dailyRemaining, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Providers</h1>
          <p className="text-gray-500 mt-1">
            Add multiple free providers. The system auto-rotates to maximise free sending capacity.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Provider
        </Button>
      </div>

      {/* Combined capacity banner */}
      {providers.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  Combined daily capacity: <span className="text-primary">{totalDailyRemaining.toLocaleString()} emails remaining</span> of {totalDailyCapacity.toLocaleString()} total
                </p>
                <p className="text-sm text-gray-500">
                  {providers.filter(p => p.isActive).length} active provider{providers.filter(p => p.isActive).length !== 1 ? "s" : ""} — the router picks the one with the most remaining quota.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test email input */}
      {providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TestTube className="w-4 h-4" /> Test Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="your@email.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="max-w-xs"
              />
              <span className="text-sm text-gray-500 self-center">Enter an address to test any provider below</span>
            </div>
            {testResult && (
              <div className={cn("mt-3 flex items-center gap-2 text-sm", testResult.success ? "text-green-600" : "text-red-600")}>
                {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {testResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading providers…</div>
      ) : providers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-900 mb-2">No email providers yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Add free providers like Brevo, Resend, or Mailjet. The router rotates between them to maximise your free sending quota.
            </p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Your First Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers
            .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
            .map(p => (
              <Card key={p.id} className={cn(!p.isActive && "opacity-60")}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className="mt-1">
                      {p.isActive && p.dailyRemaining > 0
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : p.isActive
                        ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                        : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        <Badge variant="secondary" className="capitalize text-xs">{p.providerType}</Badge>
                        {!p.hasApiKey && <Badge variant="destructive" className="text-xs">No API Key</Badge>}
                        <Badge variant="outline" className="text-xs">Priority {p.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{p.fromName} &lt;{p.fromEmail}&gt;</p>

                      {/* Quota bars */}
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Daily</span>
                            <span>{p.dailySent} / {p.dailyLimit}</span>
                          </div>
                          <Progress value={p.dailyUsedPct} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Monthly</span>
                            <span>{p.monthlySent} / {p.monthlyLimit}</span>
                          </div>
                          <Progress value={p.monthlyUsedPct} className="h-1.5" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={val => toggleMutation.mutate({ id: p.id, isActive: val })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleTest(p.id)} disabled={testingId === p.id} title="Send test email">
                        <TestTube className={cn("w-4 h-4", testingId === p.id && "animate-pulse")} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => resetQuotaMutation.mutate(p.id)} title="Reset quota counters">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Free tier reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />Free Tier Reference</CardTitle>
          <CardDescription>Combined across all providers you add — the router rotates automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-gray-500">Provider</th>
                  <th className="text-right pb-2 font-medium text-gray-500">Daily (free)</th>
                  <th className="text-right pb-2 font-medium text-gray-500">Monthly (free)</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {PROVIDER_TYPES.map(type => {
                  const i = providerInfo[type];
                  if (!i) return null;
                  return (
                    <tr key={type} className="border-b last:border-0">
                      <td className="py-2 font-medium">{i.label}</td>
                      <td className="py-2 text-right">{i.freeDailyLimit.toLocaleString()}</td>
                      <td className="py-2 text-right">{i.freeMonthlyLimit.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <a href={i.signupUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                            Get key <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-primary/5 font-semibold">
                  <td className="py-2 rounded-l-md pl-2">Total (all providers)</td>
                  <td className="py-2 text-right text-primary">
                    {PROVIDER_TYPES.reduce((s, t) => s + (providerInfo[t]?.freeDailyLimit ?? 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-primary rounded-r-md pr-2">
                    {PROVIDER_TYPES.reduce((s, t) => s + (providerInfo[t]?.freeMonthlyLimit ?? 0), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Provider" : "Add Email Provider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingId && (
              <div className="space-y-1.5">
                <Label>Provider Type</Label>
                <Select value={form.providerType} onValueChange={onProviderTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {providerInfo[t]?.label ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {info && (
                  <p className="text-xs text-gray-500 mt-1">{info.notes}{" "}
                    <a href={info.signupUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Get API key ↗</a>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Brevo account" />
              </div>
              <div className="space-y-1.5">
                <Label>Priority (higher = preferred)</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{info?.apiKeyLabel ?? "API Key"}</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder={editingId ? "Leave blank to keep existing" : "Paste API key here"}
              />
            </div>

            {info?.requiresSecret && (
              <div className="space-y-1.5">
                <Label>{info.secretLabel ?? "Secret Key"}</Label>
                <Input
                  type="password"
                  value={form.apiSecret}
                  onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))}
                  placeholder="Paste secret key"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Email</Label>
                <Input type="email" value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))} placeholder="newsletter@yourdomain.com" />
              </div>
              <div className="space-y-1.5">
                <Label>From Name</Label>
                <Input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Daily Limit</Label>
                <Input type="number" value={form.dailyLimit} onChange={e => setForm(f => ({ ...f, dailyLimit: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Limit</Label>
                <Input type="number" value={form.monthlyLimit} onChange={e => setForm(f => ({ ...f, monthlyLimit: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => {
                const payload = { ...form };
                if (editingId) updateMutation.mutate({ id: editingId, ...payload });
                else createMutation.mutate(payload);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Save Changes" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
