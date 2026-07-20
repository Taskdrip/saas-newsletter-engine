import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListWebsites } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Plus, Code, CheckCircle2, XCircle } from 'lucide-react';

export default function WebsitesPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: websites, isLoading } = useListWebsites(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Websites</h1>
          <p className="text-muted-foreground">Track pageviews and trigger automations from site activity.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Connect Website</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading websites...</div>
        ) : websites && websites.length > 0 ? (
          websites.map(site => (
            <Card key={site.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{site.name}</h3>
                      <p className="text-sm text-primary hover:underline cursor-pointer">{site.url}</p>
                    </div>
                  </div>
                  {site.isVerified ? (
                    <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                      <XCircle className="w-4 h-4" /> Unverified
                    </div>
                  )}
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Pageviews (30d)</div>
                    <div className="text-2xl font-bold">{site.pageviewsLast30d?.toLocaleString() || 0}</div>
                  </div>
                  <div className="h-10 w-px bg-border mx-4"></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div className="font-medium capitalize">{site.status}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1"><Code className="w-4 h-4 mr-2" /> View Script</Button>
                  {!site.isVerified && <Button variant="secondary" className="flex-1">Verify Now</Button>}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-4">No websites connected. Add a site to enable tracking.</p>
            <Button variant="outline">Connect First Website</Button>
          </div>
        )}
      </div>
    </div>
  );
}
