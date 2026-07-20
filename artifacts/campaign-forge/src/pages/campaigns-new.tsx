import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useCreateCampaign, CampaignInputType } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function CampaignNewPage() {
  const { workspaceId } = useWorkspace();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  
  const createCampaign = useCreateCampaign();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    createCampaign.mutate({
      data: {
        workspaceId,
        name,
        subject,
        fromName,
        fromEmail,
        type: 'regular' as CampaignInputType
      }
    }, {
      onSuccess: (data) => {
        toast({ title: "Campaign created successfully" });
        setLocation(`/campaigns`); // Normally would go to edit page
      },
      onError: (error: any) => {
        toast({ title: "Error creating campaign", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">Start building your next broadcast.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Name</label>
              <Input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Q3 Newsletter"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Line</label>
              <Input 
                required 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                placeholder="Enter a catchy subject line"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Name</label>
                <Input 
                  value={fromName} 
                  onChange={e => setFromName(e.target.value)} 
                  placeholder="e.g. Acme Marketing"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Email</label>
                <Input 
                  type="email"
                  value={fromEmail} 
                  onChange={e => setFromEmail(e.target.value)} 
                  placeholder="hello@acme.com"
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3">
              <Link href="/campaigns">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
