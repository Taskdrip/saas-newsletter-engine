import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListCampaigns, useDeleteCampaign } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Search, Mail, Filter, MoreHorizontal, Calendar, PlayCircle, Copy, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from '@/lib/queryClient';

export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: campaignsPage, isLoading } = useListCampaigns(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  const deleteCampaign = useDeleteCampaign();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaign.mutate({ campaignId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled': return <Badge variant="warning">Scheduled</Badge>;
      case 'running': return <Badge variant="info">Running</Badge>;
      case 'finished': return <Badge variant="success">Finished</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCampaigns = campaignsPage?.data?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage and track your email broadcasts.</p>
        </div>
        <Link href="/campaigns/new">
          <Button><Mail className="w-4 h-4 mr-2" /> Create Campaign</Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search campaigns..." 
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
                  <th className="py-3 px-4 font-medium">Campaign Name</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Recipients</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map(campaign => (
                    <tr key={campaign.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{campaign.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject || 'No subject'}</div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(campaign.status)}</td>
                      <td className="py-3 px-4">{campaign.totalRecipients?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {campaign.sentAt ? format(parseISO(campaign.sentAt), 'MMM d, yyyy') :
                         campaign.scheduledAt ? format(parseISO(campaign.scheduledAt), 'MMM d, yyyy') : 
                         'Not set'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            {campaign.status === 'draft' && (
                              <>
                                <DropdownMenuItem className="cursor-pointer">
                                  <PlayCircle className="w-4 h-4 mr-2" /> Send Now
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Calendar className="w-4 h-4 mr-2" /> Schedule
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDelete(campaign.id)}>
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
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Mail className="w-10 h-10 mb-3 opacity-20" />
                        <p>No campaigns found</p>
                        <Link href="/campaigns/new" className="mt-4">
                          <Button variant="outline">Create your first campaign</Button>
                        </Link>
                      </div>
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
