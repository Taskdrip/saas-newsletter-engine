import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, Edit2, Mail, Building2, CreditCard, Calendar } from "lucide-react";

interface UserRecord {
  id: number;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  organization: { id: number; name: string; slug: string } | null;
  subscription: {
    planId: string;
    planName: string;
    status: string;
    emailsSentThisMonth: number;
    subscribersUsed: number;
  } | null;
}

interface PricingPlan {
  id: number; slug: string; name: string; isActive: boolean;
}

const PLAN_COLORS: Record<string, string> = {
  free: "secondary",
  starter: "outline",
  pro: "default",
  business: "default",
  enterprise: "default",
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newPlanId, setNewPlanId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest("/api/admin/users"),
    refetchInterval: 60_000,
  });

  const { data: plans = [] } = useQuery<PricingPlan[]>({
    queryKey: ["admin-pricing-plans"],
    queryFn: () => apiRequest("/api/admin/pricing-plans"),
  });

  const changePlanMutation = useMutation({
    mutationFn: ({ userId, planId }: { userId: number; planId: string }) =>
      apiRequest(`/api/admin/users/${userId}/plan`, { method: "PUT", body: { planId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setEditingUser(null); },
  });

  const users: UserRecord[] = data?.users ?? [];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.email.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.organization?.name?.toLowerCase().includes(q) ?? false);
    const matchesPlan = planFilter === "all" || u.subscription?.planId === planFilter;
    return matchesSearch && matchesPlan;
  });

  const allPlans = Array.from(new Set(users.map(u => u.subscription?.planId).filter(Boolean)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">View all users and manage their subscription plans.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, or org…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {allPlans.map(p => (
              <SelectItem key={p} value={p!}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-gray-500">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length },
          { label: "With Org", value: users.filter(u => u.organization).length },
          { label: "Paid Plans", value: users.filter(u => u.subscription && u.subscription.planId !== "free").length },
          { label: "Free Plan", value: users.filter(u => !u.subscription || u.subscription.planId === "free").length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading users…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-900 mb-1">No users found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filter.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-500">User</th>
                    <th className="text-left p-4 font-medium text-gray-500">Organization</th>
                    <th className="text-left p-4 font-medium text-gray-500">Plan</th>
                    <th className="text-left p-4 font-medium text-gray-500">Usage</th>
                    <th className="text-left p-4 font-medium text-gray-500">Joined</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                            </p>
                            <p className="text-gray-400 text-xs flex items-center gap-1">
                              <Mail className="w-3 h-3" />{user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.organization ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {user.organization.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {user.subscription ? (
                          <Badge variant={(PLAN_COLORS[user.subscription.planId] as any) || "outline"} className="capitalize">
                            {user.subscription.planName}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {user.subscription ? (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <p>{user.subscription.emailsSentThisMonth.toLocaleString()} emails this month</p>
                            <p>{user.subscription.subscribersUsed.toLocaleString()} subscribers</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No data</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {user.organization && (
                          <Button
                            variant="ghost" size="sm"
                            className="gap-1"
                            onClick={() => { setEditingUser(user); setNewPlanId(user.subscription?.planId || "free"); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Change Plan
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change plan dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan for {editingUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <p className="text-sm text-gray-500">
                Organization: <strong>{editingUser?.organization?.name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Current plan: <strong className="capitalize">{editingUser?.subscription?.planName || "Free"}</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Plan</label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.isActive).map(p => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              onClick={() => editingUser && changePlanMutation.mutate({ userId: editingUser.id, planId: newPlanId })}
              disabled={changePlanMutation.isPending}
            >
              Save Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
