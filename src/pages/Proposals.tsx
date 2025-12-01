import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Proposal } from "@/types/proposal";
import { Logo } from "@/components/Logo";

const Proposals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchProposals();
    }
  }, [user, filter]);

  const fetchProposals = async () => {
    try {
      let query = supabase
        .from('proposals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProposals((data || []) as unknown as Proposal[]);
    } catch (error: any) {
      toast.error('Failed to fetch proposals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Proposal deleted');
      fetchProposals();
    } catch (error: any) {
      toast.error('Failed to delete proposal');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "outline",
      active: "default",
      archived: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                Back to Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/services')}>
                Services
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/proposals/templates')}>
                Templates
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Proposals
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Create and manage client proposals</p>
          </div>
          <Button onClick={() => navigate('/proposals/new')} size="lg" className="shadow-medium hover:shadow-large transition-all">
            <Plus className="mr-2 h-5 w-5" />
            New Proposal
          </Button>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'draft', 'sent', 'active', 'archived'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
              className="transition-all hover:scale-105"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : proposals.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No proposals found</h3>
            <p className="text-muted-foreground mb-6">Create your first proposal to get started</p>
            <Button onClick={() => navigate('/proposals/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Proposal
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {proposals.map((proposal) => (
              <Card key={proposal.id} className="p-6 hover:shadow-medium transition-all duration-300 bg-gradient-card group hover:scale-[1.01]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">{proposal.client_name}</h3>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      {proposal.client_email && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <span>{proposal.client_email}</span>
                        </div>
                      )}
                      {proposal.client_phone && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Phone:</span>
                          <span>{proposal.client_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total:</span>
                        <span className="text-lg font-bold text-primary">${proposal.total_value.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Duration:</span>
                        <span>{proposal.contract_duration}</span>
                      </div>
                      {proposal.contract_number && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Contract:</span>
                          <span>{proposal.contract_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Created:</span>
                        <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      className="hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                      className="hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteProposal(proposal.id)}
                      className="hover:bg-destructive hover:text-destructive-foreground transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Proposals;
