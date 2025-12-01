import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ClientOverview } from "@/components/client-detail/ClientOverview";
import { ClientActivity } from "@/components/client-detail/ClientActivity";
import { ClientTasks } from "@/components/client-detail/ClientTasks";
import { ClientSettings } from "@/components/client-detail/ClientSettings";
import { BusinessIntelligenceDashboard } from "@/components/BusinessIntelligenceDashboard";
import { MonthlyBISummaryGenerator } from "@/components/MonthlyBISummaryGenerator";
import { AddDeliverableDialog } from "@/components/AddDeliverableDialog";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { AddTodoDialog } from "@/components/AddTodoDialog";
import { EditClientDialog } from "@/components/EditClientDialog";
import { DeleteClientDialog } from "@/components/DeleteClientDialog";
import { ShareLinkDialog } from "@/components/ShareLinkDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Share2, Building2, Edit, Trash2, FileText } from "lucide-react";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      const [clientRes, deliverablesRes, todosRes, activitiesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('deliverables').select('*').eq('client_id', id).order('created_at', { ascending: true }),
        supabase.from('todos').select('*').eq('client_id', id).order('due_date', { ascending: true }),
        supabase.from('activities').select('*').eq('client_id', id).order('date', { ascending: false }).limit(20),
      ]);

      if (clientRes.error) throw clientRes.error;
      
      setClient(clientRes.data);
      setDeliverables(deliverablesRes.data || []);
      setTodos(todosRes.data || []);
      setActivities(activitiesRes.data || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientDeleted = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Client not found</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: "bg-success text-success-foreground",
    paused: "bg-warning text-warning-foreground",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
                  <Badge className={statusColors[client.status]} variant="secondary">
                    {client.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{client.contract_type}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditDialogOpen(true)}
                title="Edit client"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                title="Delete client"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/proposals/new?clientId=${id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
              <Button
                onClick={() => setShareDialogOpen(true)}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share with Client
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="business-intel">Business Intel</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverview
              client={client}
              deliverables={deliverables}
              activities={activities}
              todos={todos}
              onAddDeliverable={fetchClientData}
            />
            <div className="hidden">
              <AddDeliverableDialog clientId={id!} onDeliverableAdded={fetchClientData} />
            </div>
          </TabsContent>

          <TabsContent value="business-intel">
            <div className="space-y-6">
              <BusinessIntelligenceDashboard clientId={id!} />
              <MonthlyBISummaryGenerator clientId={id!} clientName={client.name} />
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ClientActivity
              activities={activities}
              clientId={id!}
              onActivityAdded={fetchClientData}
            />
            <div className="hidden">
              <AddActivityDialog clientId={id!} onActivityAdded={fetchClientData} />
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <ClientTasks
              todos={todos}
              clientId={id!}
              onTodoAdded={fetchClientData}
            />
            <div className="hidden">
              <AddTodoDialog clientId={id!} onTodoAdded={fetchClientData} />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <ClientSettings
              client={client}
              clientId={id!}
              onEdit={() => setEditDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              onShare={() => setShareDialogOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        clientId={id!}
      />

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        clientId={id!}
        currentData={client}
        onClientUpdated={fetchClientData}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientId={id!}
        clientName={client.name}
        onClientDeleted={handleClientDeleted}
      />
    </div>
  );
};

export default ClientDetail;
