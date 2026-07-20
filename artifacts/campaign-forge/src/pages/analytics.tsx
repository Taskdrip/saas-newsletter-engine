import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGetDashboardStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Mail, MousePointerClick, AlertCircle } from 'lucide-react';

const mockDeviceData = [
  { name: 'Desktop', value: 45 },
  { name: 'Mobile', value: 52 },
  { name: 'Tablet', value: 3 },
];

const mockMonthlyData = [
  { name: 'Jan', opens: 4000, clicks: 2400 },
  { name: 'Feb', opens: 3000, clicks: 1398 },
  { name: 'Mar', opens: 2000, clicks: 9800 },
  { name: 'Apr', opens: 2780, clicks: 3908 },
  { name: 'May', opens: 1890, clicks: 4800 },
  { name: 'Jun', opens: 2390, clicks: 3800 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function AnalyticsPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: stats } = useGetDashboardStats(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Deep dive into your engagement metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-transparent">
          <CardContent className="p-6">
            <Mail className="w-8 h-8 mb-4 opacity-80" />
            <div className="text-4xl font-bold mb-1">{stats?.totalSent?.toLocaleString() || 0}</div>
            <div className="text-sm font-medium opacity-80">Total Emails Sent (All Time)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <MousePointerClick className="w-8 h-8 mb-4 text-chart-2" />
            <div className="text-4xl font-bold mb-1">{stats?.avgClickRate?.toFixed(1) || 0}%</div>
            <div className="text-sm font-medium text-muted-foreground">Average Click-to-Open Rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 mb-4 text-chart-3" />
            <div className="text-4xl font-bold mb-1">{stats?.avgBounceRate?.toFixed(2) || 0}%</div>
            <div className="text-sm font-medium text-muted-foreground">Average Bounce Rate</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMonthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} 
                  />
                  <Bar dataKey="opens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockDeviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockDeviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {mockDeviceData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-medium text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
