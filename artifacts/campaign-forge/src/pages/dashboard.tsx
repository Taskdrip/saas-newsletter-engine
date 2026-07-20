import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGetDashboardStats, useGetSubscriberGrowth, useGetRecentActivity, useListCampaigns } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Users, Mail, MousePointerClick, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

function StatCard({ title, value, icon: Icon, trend, subtext }: { title: string, value: string | number, icon: any, trend?: string, subtext?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || subtext) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend && <span className="text-emerald-500 font-medium flex items-center"><ArrowUpRight className="w-3 h-3" /> {trend}</span>}
            {subtext && <span>{subtext}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  const { data: growthData } = useGetSubscriberGrowth(
    { workspaceId: workspaceId!, period: '30d' },
    { query: { enabled: !!workspaceId } as any }
  );

  const { data: recentActivity } = useGetRecentActivity(
    { workspaceId: workspaceId!, limit: 5 },
    { query: { enabled: !!workspaceId } as any }
  );

  const { data: campaigns } = useListCampaigns(
    { workspaceId: workspaceId!, limit: 5, status: 'finished' },
    { query: { enabled: !!workspaceId } as any }
  );

  if (!workspaceId) return <div className="p-8">Loading workspace...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Monitor your campaign performance and audience growth.</p>
        </div>
        <Link href="/campaigns/new">
          <Button><Mail className="w-4 h-4 mr-2" /> New Campaign</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Subscribers" 
          value={stats?.totalSubscribers?.toLocaleString() || 0} 
          icon={Users} 
          trend={stats?.newSubscribersThisPeriod ? `+${stats.newSubscribersThisPeriod}` : undefined}
          subtext="this month"
        />
        <StatCard 
          title="Avg Open Rate" 
          value={`${stats?.avgOpenRate?.toFixed(1) || 0}%`} 
          icon={Mail} 
        />
        <StatCard 
          title="Avg Click Rate" 
          value={`${stats?.avgClickRate?.toFixed(1) || 0}%`} 
          icon={MousePointerClick} 
        />
        <StatCard 
          title="Bounce Rate" 
          value={`${stats?.avgBounceRate?.toFixed(1) || 0}%`} 
          icon={AlertTriangle} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Audience Growth</CardTitle>
            <CardDescription>Net new subscribers over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {growthData && growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), 'MMM d')} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                    />
                    <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No growth data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex flex-shrink-0 items-center justify-center text-muted-foreground">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-medium">Campaign</th>
                  <th className="pb-3 font-medium">Sent Date</th>
                  <th className="pb-3 font-medium text-right">Recipients</th>
                  <th className="pb-3 font-medium text-right">Open Rate</th>
                  <th className="pb-3 font-medium text-right">Click Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns?.data && campaigns.data.length > 0 ? (
                  campaigns.data.map(c => (
                    <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium text-foreground">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.sentAt ? format(parseISO(c.sentAt), 'MMM d, yyyy') : '-'}</td>
                      <td className="py-3 text-right">{c.totalRecipients?.toLocaleString() || 0}</td>
                      <td className="py-3 text-right">
                        {/* We would typically have campaign stats here, mocking display for now since API returns Campaign, not CampaignPerformance by default on List */}
                        <Badge variant="success">--%</Badge>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">--%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No campaigns sent yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
