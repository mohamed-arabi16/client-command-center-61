import { Client, Deliverable, ActivityItem, TodoItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeliverableProgress } from "@/components/DeliverableProgress";
import { AddDeliverableDialog } from "@/components/AddDeliverableDialog";
import { Calendar, DollarSign, FileText, Activity, ListTodo, Instagram, RefreshCw, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractInstagramHandle } from "@/utils/instagram";
import { toast } from "sonner";
import { useState, useMemo } from "react";

interface ClientOverviewProps {
  client: Client;
  deliverables: Deliverable[];
  activities: ActivityItem[];
  todos: TodoItem[];
  onAddDeliverable: () => void;
}

export const ClientOverview = ({
  client,
  deliverables,
  activities,
  todos,
  onAddDeliverable,
}: ClientOverviewProps) => {
  const [refreshingInstagram, setRefreshingInstagram] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [resettingPeriod, setResettingPeriod] = useState(false);

  // Generate last 6 months for dropdown
  const availablePeriods = useMemo(() => {
    const periods = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.push({
        value: period,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return periods;
  }, []);

  // Filter deliverables by selected period
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => d.billing_period === selectedPeriod);
  }, [deliverables, selectedPeriod]);

  const overallProgress =
    filteredDeliverables.length > 0
      ? filteredDeliverables.reduce((sum, d) => sum + (d.completed / d.total) * 100, 0) /
      filteredDeliverables.length
      : 0;

  const pendingTodos = todos.filter((t) => !t.completed).length;
  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(client.start_date).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  const handleResetMonthlyDeliverables = async () => {
    if (!confirm(`Reset deliverables for ${availablePeriods.find(p => p.value === selectedPeriod)?.label}? This will create new deliverables based on the active proposal.`)) {
      return;
    }

    setResettingPeriod(true);
    try {
      // Find active proposals for this client
      const { data: proposals, error: proposalError } = await supabase
        .from('proposals')
        .select('id')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .limit(1);

      if (proposalError) throw proposalError;

      if (!proposals || proposals.length === 0) {
        toast.error('No active proposal found for this client');
        return;
      }

      const proposalId = proposals[0].id;

      // Fetch proposal items
      const { data: items, error: itemsError } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId);

      if (itemsError) throw itemsError;

      // Create new deliverables for the selected period
      const newDeliverables = items.map(item => ({
        client_id: client.id,
        proposal_id: proposalId,
        type: item.service_name,
        total: item.quantity,
        completed: 0,
        period: 'monthly',
        billing_period: selectedPeriod
      }));

      const { error: insertError } = await supabase
        .from('deliverables')
        .insert(newDeliverables);

      if (insertError) throw insertError;

      toast.success('Monthly deliverables reset successfully!');
      onAddDeliverable(); // Refresh data
    } catch (error: any) {
      toast.error('Failed to reset deliverables');
      console.error(error);
    } finally {
      setResettingPeriod(false);
    }
  };

  const handleRefreshInstagram = async () => {
    if (!client.instagram_url) return;

    const handle = extractInstagramHandle(client.instagram_url);
    if (!handle) {
      toast.error('Invalid Instagram URL');
      return;
    }

    setRefreshingInstagram(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-instagram', {
        body: { instagram_handle: handle }
      });

      if (error) throw error;

      if (data?.success) {
        const profileData = data.data;

        // Update client with fresh Instagram data
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            instagram_handle: handle,
            instagram_profile_pic_url: profileData.profile_pic_url,
            instagram_bio: profileData.bio,
            instagram_follower_count: profileData.follower_count,
            instagram_scraped_at: new Date().toISOString(),
          })
          .eq('id', client.id);

        if (updateError) throw updateError;

        toast.success('Instagram data refreshed!');
        window.location.reload(); // Reload to show updated data
      } else {
        throw new Error(data?.error || 'Failed to refresh Instagram profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh Instagram profile');
      console.error('Instagram refresh error:', error);
    } finally {
      setRefreshingInstagram(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {activities.length}
              </p>
              <p className="text-xs text-muted-foreground">Activities Logged</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <ListTodo className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingTodos}</p>
              <p className="text-xs text-muted-foreground">Pending Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Calendar className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {daysSinceStart}
              </p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instagram Information */}
      {client.instagram_handle && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-primary" />
                Instagram Profile
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshInstagram}
                disabled={refreshingInstagram}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshingInstagram ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {client.instagram_profile_pic_url && (
                <img
                  src={client.instagram_profile_pic_url}
                  alt={client.instagram_handle}
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <a
                  href={`https://instagram.com/${client.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-primary hover:underline"
                >
                  @{client.instagram_handle}
                </a>
                {client.instagram_follower_count && (
                  <p className="text-sm text-muted-foreground">
                    {client.instagram_follower_count.toLocaleString()} followers
                  </p>
                )}
              </div>
            </div>

            {client.instagram_bio && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bio</p>
                <p className="text-sm text-foreground">{client.instagram_bio}</p>
              </div>
            )}

            {client.instagram_scraped_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(client.instagram_scraped_at).toLocaleDateString()}
              </p>
            )}

            {/* Notice for incomplete data */}
            {(!client.instagram_profile_pic_url || !client.instagram_bio || !client.instagram_follower_count) && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Note:</span> Some Instagram data is missing. 
                  You can manually add it by editing the client, or try refreshing the data above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Information */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Contract Type</p>
              <p className="font-medium text-foreground">{client.contract_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge
                variant={
                  client.status === "active"
                    ? "default"
                    : client.status === "paused"
                      ? "secondary"
                      : "outline"
                }
              >
                {client.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Start Date</p>
              <p className="font-medium text-foreground">
                {new Date(client.start_date).toLocaleDateString()}
              </p>
            </div>
            {client.total_contract_value && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Contract Value
                </p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {client.total_contract_value.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {client.payment_terms && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Payment Terms</p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Installment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(client.payment_terms) && client.payment_terms.map((term: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>#{term.installment || index + 1}</TableCell>
                        <TableCell>${term.amount?.toLocaleString()}</TableCell>
                        <TableCell>{term.due_date ? new Date(term.due_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={term.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                            {term.status || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverable Progress */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Contract Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Overall: {overallProgress.toFixed(0)}% complete
              </p>
            </div>
            <AddDeliverableDialog clientId={client.id} onDeliverableAdded={onAddDeliverable} />
          </div>
        </CardHeader>
        <CardContent>
          <DeliverableProgress deliverables={deliverables} />
        </CardContent>
      </Card>
    </div>
  );
};
