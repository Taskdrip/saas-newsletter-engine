import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Star, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: number;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: { subscribers?: number | null; emailsPerMonth?: number | null; workspaces?: number | null; teamMembers?: number | null };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

const EMPTY_FORM = {
  slug: "", name: "", description: "",
  priceMonthly: 0, priceYearly: 0,
  featuresText: "",
  limitSubscribers: "", limitEmails: "", limitWorkspaces: "", limitTeam: "",
  isPopular: false, isActive: true, sortOrder: 0,
};

export default function AdminPricing() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: plans = [], isLoading } = useQuery<PricingPlan[]>({
    queryKey: ["admin-pricing-plans"],
    queryFn: () => apiRequest("/api/admin/pricing-plans"),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("/api/admin/pricing-plans", { method: "POST", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest(`/api/admin/pricing-plans/${id}`, { method: "PUT", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/pricing-plans/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/admin/pricing-plans/${id}`, { method: "PUT", body: { isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] }),
  });

  function close() { setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }

  function openEdit(p: PricingPlan) {
    setForm({
      slug: p.slug, name: p.name, description: p.description,
      priceMonthly: Math.round(p.priceMonthly / 100),
      priceYearly: Math.round(p.priceYearly / 100),
      featuresText: (p.features || []).join("\n"),
      limitSubscribers: p.limits?.subscribers != null ? String(p.limits.subscribers) : "",
      limitEmails: p.limits?.emailsPerMonth != null ? String(p.limits.emailsPerMonth) : "",
      limitWorkspaces: p.limits?.workspaces != null ? String(p.limits.workspaces) : "",
      limitTeam: p.limits?.teamMembers != null ? String(p.limits.teamMembers) : "",
      isPopular: p.isPopular, isActive: p.isActive, sortOrder: p.sortOrder,
    });
    setEditingId(p.id);
    setDialogOpen(true);
  }

  function buildPayload() {
    return {
      slug: form.slug, name: form.name, description: form.description,
      priceMonthly: Math.round(parseFloat(form.priceMonthly as any) * 100) || 0,
      priceYearly: Math.round(parseFloat(form.priceYearly as any) * 100) || 0,
      features: form.featuresText.split("\n").map(s => s.trim()).filter(Boolean),
      limits: {
        subscribers: form.limitSubscribers ? parseInt(form.limitSubscribers) : null,
        emailsPerMonth: form.limitEmails ? parseInt(form.limitEmails) : null,
        workspaces: form.limitWorkspaces ? parseInt(form.limitWorkspaces) : null,
        teamMembers: form.limitTeam ? parseInt(form.limitTeam) : null,
      },
      isPopular: form.isPopular, isActive: form.isActive, sortOrder: form.sortOrder,
    };
  }

  const formatPrice = (cents: number) => cents === 0 ? "Free" : `$${Math.round(cents / 100)}/mo`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Plans</h1>
          <p className="text-gray-500 mt-1">Create and manage subscription plans. Changes take effect immediately for new subscribers.</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setEditingId(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plan cards */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading plans…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.sort((a, b) => a.sortOrder - b.sortOrder).map(plan => (
            <Card key={plan.id} className={cn("relative", !plan.isActive && "opacity-60", plan.isPopular && "border-primary shadow-md")}>
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1"><Star className="w-3 h-3 fill-current" /> Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                  </div>
                  <Switch
                    checked={plan.isActive}
                    onCheckedChange={val => toggleMutation.mutate({ id: plan.id, isActive: val })}
                  />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{plan.priceMonthly === 0 ? "Free" : `$${Math.round(plan.priceMonthly / 100)}`}</span>
                  {plan.priceMonthly > 0 && <span className="text-gray-400 text-sm">/month</span>}
                  {plan.priceYearly > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">${Math.round(plan.priceYearly / 100)}/year (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Limits */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  {[
                    { label: "Subscribers", val: plan.limits?.subscribers },
                    { label: "Emails/mo", val: plan.limits?.emailsPerMonth },
                    { label: "Workspaces", val: plan.limits?.workspaces },
                    { label: "Team members", val: plan.limits?.teamMembers },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded px-2 py-1.5">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="font-semibold">{val == null ? "∞" : val.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-4">
                  {(plan.features || []).slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                  {(plan.features || []).length > 5 && (
                    <li className="text-xs text-gray-400">+{plan.features.length - 5} more features</li>
                  )}
                </ul>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(plan)}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => { if (confirm("Delete this plan?")) deleteMutation.mutate(plan.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan Slug (unique ID)</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="pro" disabled={!!editingId} />
              </div>
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Pro" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="For scaling teams" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Price ($)</Label>
                <Input type="number" min={0} value={form.priceMonthly} onChange={e => setForm(f => ({ ...f, priceMonthly: parseFloat(e.target.value) || 0 }))} placeholder="79" />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price ($) <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Input type="number" min={0} value={form.priceYearly} onChange={e => setForm(f => ({ ...f, priceYearly: parseFloat(e.target.value) || 0 }))} placeholder="758" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max Subscribers <span className="text-gray-400 text-xs">(blank = unlimited)</span></Label>
                <Input type="number" value={form.limitSubscribers} onChange={e => setForm(f => ({ ...f, limitSubscribers: e.target.value }))} placeholder="50000" />
              </div>
              <div className="space-y-1.5">
                <Label>Emails / Month <span className="text-gray-400 text-xs">(blank = unlimited)</span></Label>
                <Input type="number" value={form.limitEmails} onChange={e => setForm(f => ({ ...f, limitEmails: e.target.value }))} placeholder="500000" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Workspaces <span className="text-gray-400 text-xs">(blank = unlimited)</span></Label>
                <Input type="number" value={form.limitWorkspaces} onChange={e => setForm(f => ({ ...f, limitWorkspaces: e.target.value }))} placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Team Members <span className="text-gray-400 text-xs">(blank = unlimited)</span></Label>
                <Input type="number" value={form.limitTeam} onChange={e => setForm(f => ({ ...f, limitTeam: e.target.value }))} placeholder="20" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Features <span className="text-gray-400 text-xs">(one per line)</span></Label>
              <Textarea
                value={form.featuresText}
                onChange={e => setForm(f => ({ ...f, featuresText: e.target.value }))}
                rows={5}
                placeholder={"50,000 subscribers\n500,000 emails/month\nAdvanced analytics\n24/7 support"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isPopular} onCheckedChange={v => setForm(f => ({ ...f, isPopular: v }))} />
                <span className="text-sm font-medium">Mark as Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                const payload = buildPayload();
                if (editingId) updateMutation.mutate({ id: editingId, ...payload });
                else createMutation.mutate(payload);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
