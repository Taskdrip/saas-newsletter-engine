import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListLists, useCreateList, useDeleteList, ListInputType } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, List as ListIcon, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ListsPage() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  
  const { data: lists, isLoading } = useListLists(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  const deleteList = useDeleteList();

  const handleDelete = (id: number) => {
    if (confirm("Delete this list?")) {
      deleteList.mutate({ listId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
          toast({ title: "List deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lists</h1>
          <p className="text-muted-foreground">Organize your subscribers into static or dynamic groups.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Create List</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading lists...</div>
        ) : lists && lists.length > 0 ? (
          lists.map(list => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <ListIcon className="w-5 h-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(list.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete List
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-lg font-semibold mb-1 truncate">{list.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {list.description || "No description"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Subscribers</span>
                    <span className="font-semibold">{list.subscriberCount?.toLocaleString() || 0}</span>
                  </div>
                  <Badge variant={list.type === 'dynamic' ? 'info' : 'secondary'}>
                    {list.type === 'dynamic' ? 'Dynamic' : 'Static'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <ListIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No lists created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
