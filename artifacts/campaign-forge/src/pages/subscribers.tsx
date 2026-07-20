import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListSubscribers, useDeleteSubscriber } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus, Trash2, MoreHorizontal, DownloadCloud } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SubscribersPage() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: subscribersPage, isLoading } = useListSubscribers(
    { workspaceId: workspaceId!, search: searchTerm },
    { query: { enabled: !!workspaceId } as any }
  );

  const deleteSubscriber = useDeleteSubscriber();

  const handleDelete = (id: number) => {
    if (confirm("Delete this subscriber permanently?")) {
      deleteSubscriber.mutate({ subscriberId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/subscribers'] });
          toast({ title: "Subscriber deleted" });
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'unsubscribed': return <Badge variant="secondary">Unsubscribed</Badge>;
      case 'bounced': return <Badge variant="destructive">Bounced</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-muted-foreground">Manage your audience and segments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><DownloadCloud className="w-4 h-4 mr-2" /> Import</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> Add Subscriber</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search email or name..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="py-3 px-4 font-medium">Subscriber</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Tags</th>
                  <th className="py-3 px-4 font-medium">Joined</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : subscribersPage?.data && subscribersPage.data.length > 0 ? (
                  subscribersPage.data.map(sub => (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{sub.email}</div>
                        <div className="text-xs text-muted-foreground">{sub.firstName} {sub.lastName}</div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sub.tags && sub.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] py-0">{tag}</Badge>
                          ))}
                          {sub.tags && sub.tags.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] py-0">+{sub.tags.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {format(parseISO(sub.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDelete(sub.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <p className="text-muted-foreground">No subscribers found</p>
                    </td>
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
