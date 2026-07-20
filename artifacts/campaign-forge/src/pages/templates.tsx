import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListTemplates } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutTemplate, Plus, Copy, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TemplatesPage() {
  const { workspaceId } = useWorkspace();
  
  const { data: templates, isLoading } = useListTemplates(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Design reusable layouts for your campaigns.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading templates...</div>
        ) : templates && templates.length > 0 ? (
          templates.map(template => (
            <Card key={template.id} className="group overflow-hidden">
              <div className="aspect-[3/4] bg-muted relative border-b border-border flex items-center justify-center">
                {template.thumbnail ? (
                  <img src={template.thumbnail} alt={template.name} className="object-cover w-full h-full" />
                ) : (
                  <LayoutTemplate className="w-12 h-12 text-muted-foreground/30" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" className="w-32"><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                  <Button size="sm" variant="outline" className="w-32 bg-transparent text-white border-white/40 hover:bg-white/20"><Copy className="w-4 h-4 mr-2" /> Duplicate</Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-1">{template.category.replace('_', ' ')}</p>
                  </div>
                  {template.isGlobal && <Badge variant="secondary" className="text-[10px]">Global</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No templates found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
