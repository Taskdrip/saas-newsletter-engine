import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server, DollarSign, Users, Zap, ArrowRight,
  TrendingUp, AlertTriangle, CheckCircle
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiRequest("/api/admin/stats"),
    refetchInterval: 30_000,
  });

  const { data: providersData } = useQuery({
    queryKey: ["admin-email-providers"],
    queryFn: () => apiRequest("/api/admin/email-providers"),
  });

  const providers = providersData?.providers ?? [];
  const activeProviders = providers.filter((p: any) => p.isActive);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage email providers, pricing plans, and users.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Providers</CardTitle>
            <Server className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.providers.active ?? "—"}</div>
            <p className="text-xs text-gray-500 mt-1">of {stats?.providers.total ?? 0} configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Daily Capacity</CardTitle>
            <Zap className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.providers.totalDailyRemaining?.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              emails remaining today (of {stats?.providers.totalDailyCapacity?.toLocaleString() ?? 0})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Sent This Month</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.providers.totalMonthlySent?.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-gray-500 mt-1">across all providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Organizations</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.organizations.total ?? "—"}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.subscriptions.total ?? 0} with subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Email Provider Status</CardTitle>
            <Link href="/admin/providers">
              <Button variant="ghost" size="sm" className="gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeProviders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="font-medium">No providers configured</p>
                <p className="text-sm">Add at least one email provider to send campaigns.</p>
                <Link href="/admin/providers">
                  <Button size="sm" className="mt-3">Add Provider</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProviders.slice(0, 6).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.dailyRemaining > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{p.providerType}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{p.dailyRemaining} / {p.dailyLimit}</div>
                      <div className="text-xs text-gray-400">remaining today</div>
                    </div>
                  </div>
                ))}
                {activeProviders.length > 6 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+{activeProviders.length - 6} more providers</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions by plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subscriptions by Plan</CardTitle>
            <Link href="/admin/pricing">
              <Button variant="ghost" size="sm" className="gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.subscriptions.byPlan || Object.keys(stats.subscriptions.byPlan).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">No subscriptions yet</p>
                <p className="text-sm">Users will appear here after signing up.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.subscriptions.byPlan as Record<string, number>).map(([planId, count]) => (
                  <div key={planId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium capitalize">{planId}</span>
                    </div>
                    <Badge variant="outline">{count} org{count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/admin/providers", icon: Server, label: "Email Providers", desc: "Add & rotate free API providers" },
          { href: "/admin/pricing", icon: DollarSign, label: "Pricing Plans", desc: "Configure plans & pricing" },
          { href: "/admin/users", icon: Users, label: "User Management", desc: "View users & change plans" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link href={href} key={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
