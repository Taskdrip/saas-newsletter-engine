import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListForms } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, Plus, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function FormsPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: forms, isLoading } = useListForms(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground">Capture leads from your website directly into Forge.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Form</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading forms...</div>
        ) : forms && forms.length > 0 ? (
          forms.map(form => (
            <Card key={form.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">{form.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{form.type.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={form.status === 'active' ? 'success' : 'secondary'}>{form.status}</Badge>
                </div>
                
                <div className="mb-6">
                  <div className="text-3xl font-bold">{form.submissionCount?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Total Submissions</div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Edit</Button>
                  <Button variant="secondary" className="flex-1"><Code className="w-4 h-4 mr-2" /> Embed</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <FormInput className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-4">No forms created yet.</p>
            <Button variant="outline">Create a Form</Button>
          </div>
        )}
      </div>
    </div>
  );
}
