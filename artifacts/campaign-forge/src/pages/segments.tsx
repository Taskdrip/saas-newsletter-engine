import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListSegments, useDeleteSegment } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SegmentsPage() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  
  const { data: segments, isLoading } = useListSegments(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  const deleteSegment = useDeleteSegment();

  const handleDelete = (id: number) => {
    if (confirm("Delete this segment?")) {
      deleteSegment.mutate({ segmentId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/segments'] });
          toast({ title: "Segment deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">Target specific users based on behavior and attributes.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Segment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading segments...</div>
        ) : segments && segments.length > 0 ? (
          segments.map(segment => (
            <Card key={segment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                    <Filter className="w-5 h-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(segment.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-lg font-semibold mb-1 truncate">{segment.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {segment.description || "No description"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Matched Users</span>
                    <span className="font-semibold">{segment.subscriberCount?.toLocaleString() || 0}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="h-7 text-xs">Edit Rules</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No segments created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
