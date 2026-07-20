import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useListAutomations, useToggleAutomation } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GitBranch, Plus, Play, Pause, Settings, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { queryClient } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AutomationsPage() {
  const { workspaceId } = useWorkspace();
  const toggleAutomation = useToggleAutomation();
  
  const { data: automations, isLoading } = useListAutomations(
    { workspaceId: workspaceId! },
    { query: { enabled: !!workspaceId } as any }
  );

  const handleToggle = (id: number, active: boolean) => {
    toggleAutomation.mutate({ automationId: id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/automations'] });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">Build complex user journeys and drip sequences.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Automation</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading automations...</div>
        ) : automations && automations.length > 0 ? (
          automations.map(automation => (
            <Card key={automation.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
              {/* Status indicator bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${automation.status === 'active' ? 'bg-emerald-500' : 'bg-muted'}`} />
              
              <CardContent className="p-6 pl-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{automation.name}</h3>
                      <Badge variant={automation.status === 'active' ? 'success' : 'secondary'} className="uppercase text-[10px]">
                        {automation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <GitBranch className="w-3 h-3" /> Trigger: {automation.trigger.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" /> Edit Workflow
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border mb-4 bg-muted/20 rounded-md px-4">
                  <div>
                    <div className="text-2xl font-bold">{automation.enrolledCount?.toLocaleString() || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Currently Enrolled</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{automation.completedCount?.toLocaleString() || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Completed</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" /> Builder
                  </Button>
                  {automation.status === 'active' ? (
                    <Button variant="secondary" className="w-full text-amber-600 hover:text-amber-700" onClick={() => handleToggle(automation.id, false)}>
                      <Pause className="w-4 h-4 mr-2" /> Pause
                    </Button>
                  ) : (
                    <Button variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleToggle(automation.id, true)}>
                      <Play className="w-4 h-4 mr-2" /> Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/30">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-4">You have no active workflows.</p>
            <Button variant="outline">Create an Automation</Button>
          </div>
        )}
      </div>
    </div>
  );
}
