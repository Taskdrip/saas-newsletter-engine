import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListMembers, useListSmtpConnections, useListApiKeys } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { Settings, Users, Server, Key, CreditCard, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export default function SettingsPage() {
  const { workspaceId, activeWorkspace } = useWorkspace();
  
  const { data: members } = useListMembers(workspaceId!, { query: { enabled: !!workspaceId } as any });
  const { data: smtp } = useListSmtpConnections({ workspaceId: workspaceId! }, { query: { enabled: !!workspaceId } as any });
  const { data: apiKeys } = useListApiKeys({ workspaceId: workspaceId! }, { query: { enabled: !!workspaceId } as any });

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

        <TabsContent value="smtp">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SMTP Connections</CardTitle>
                <CardDescription>Configure your email sending infrastructure.</CardDescription>
              </div>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Provider</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smtp && smtp.length > 0 ? (
                  smtp.map(conn => (
                    <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                          <Server className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {conn.name} 
                            {conn.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">{conn.provider.replace('_', ' ')} • {conn.host}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {conn.isVerified ? (
                          <span className="text-sm text-emerald-600 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Verified</span>
                        ) : (
                          <Button variant="outline" size="sm">Test Connection</Button>
                        )}
                        <Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center border rounded-lg bg-muted/30 border-dashed">
                    <Server className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground text-sm mb-4">No SMTP connections configured.</p>
                    <Button variant="outline">Add First Provider</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
