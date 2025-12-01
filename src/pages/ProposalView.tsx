import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, Share2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Proposal } from "@/types/proposal";
import { Logo } from "@/components/Logo";

const ProposalView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadProposal();
    }
  }, [id, user]);

  const loadProposal = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProposal(data as unknown as Proposal);
    } catch (error: any) {
      toast.error('Failed to load proposal');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { proposal_id: id }
      });

      if (error) throw error;

      if (data.success && data.html) {
        setHtmlContent(data.html);
        toast.success('Document generated successfully');
      } else {
        throw new Error('Failed to generate document');
      }
    } catch (error: any) {
      toast.error('Failed to generate document');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const generateShareLink = async () => {
    try {
      const token = `prop_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('proposals')
        .update({ share_token: token })
        .eq('id', id);

      if (error) throw error;

      const shareUrl = `${window.location.origin}/proposal/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error: any) {
      toast.error('Failed to generate share link');
      console.error(error);
    }
  };

  const markAsActive = async () => {
    if (!proposal) return;

    if (proposal.status === 'active') {
      toast.info('Proposal is already active');
      return;
    }

    // Validate required fields
    if (!proposal.client_name || proposal.client_name.trim() === '') {
      toast.error('Client name is required to activate the proposal.');
      return;
    }

    if (!confirm('Mark this proposal as active? This will create deliverables and link to a client if needed.')) return;

    setConverting(true);
    try {
      let clientId = proposal.client_id;

      // Create client if doesn't exist
      if (!clientId) {
        console.log('Creating new client from proposal:', proposal.client_name);
        
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            user_id: user?.id,
            name: proposal.client_name,
            status: 'active',
            contract_type: proposal.contract_duration,
            start_date: proposal.contract_start_date || new Date().toISOString().split('T')[0],
            total_contract_value: proposal.total_value,
            instagram_url: proposal.instagram_url || null,
            payment_terms: proposal.payment_schedule as any
          }])
          .select()
          .single();

        if (clientError) {
          console.error('Client creation error:', clientError);
          throw new Error(`Failed to create client: ${clientError.message}`);
        }
        
        if (!newClient) {
          throw new Error('Client was not created successfully');
        }
        
        console.log('Client created successfully:', newClient.id);
        clientId = newClient.id;
      }

      // Generate contract number
      let contractNumber: string;
      try {
        const { data, error: contractError } = await supabase
          .rpc('generate_contract_number', { p_client_id: clientId });
        if (contractError) throw contractError;
        contractNumber = data;
      } catch {
        contractNumber = `PROP-${proposal.id.substring(0, 8).toUpperCase()}`;
      }

      // Fetch proposal items
      const { data: items, error: itemsError } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposal.id);

      if (itemsError) throw itemsError;

      // Create deliverables from proposal items
      const currentMonth = new Date().toISOString().slice(0, 7);
      const deliverables = items.map(item => ({
        client_id: clientId,
        proposal_id: proposal.id,
        type: item.service_name,
        total: item.quantity,
        completed: 0,
        period: proposal.contract_duration,
        billing_period: currentMonth
      }));

      const { error: delivError } = await supabase
        .from('deliverables')
        .insert(deliverables);

      if (delivError) throw delivError;

      // Update proposal
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ 
          status: 'active',
          client_id: clientId,
          converted_to_client_id: clientId,
          contract_number: contractNumber,
          accepted_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      toast.success(`Proposal marked as active! Contract #${contractNumber}`);
      loadProposal();
    } catch (error: any) {
      console.error('Error marking proposal as active:', error);
      const errorMessage = error?.message || 'Failed to mark proposal as active.';
      toast.error(errorMessage);
    } finally {
      setConverting(false);
    }
  };

  const printDocument = () => {
    window.print();
  };

  const downloadContract = async () => {
    if (!htmlContent) {
      toast.error('Please generate the document first');
      return;
    }
    
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Proposal not found</p>
        <Button onClick={() => navigate('/proposals')}>Back to Proposals</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/proposals')}>
                Back to Proposals
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 print:hidden">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">{proposal.client_name}</h1>
          <p className="text-muted-foreground">Proposal • ${proposal.total_value.toFixed(2)}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Button onClick={generateDocument} disabled={generating} size="lg" className="w-full">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate Document
          </Button>
          <Button onClick={downloadContract} disabled={!htmlContent} variant="outline" size="lg" className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={generateShareLink} variant="outline" size="lg" className="w-full">
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
          {(proposal.status === 'draft' || proposal.status === 'sent') && (
            <Button onClick={markAsActive} disabled={converting} size="lg" variant="default" className="w-full">
              {converting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Mark as Active
            </Button>
          )}
          {proposal.status === 'active' && proposal.contract_number && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground col-span-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Contract #{proposal.contract_number}
            </div>
          )}
        </div>

        {!htmlContent && (
          <Card className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Document Preview</h3>
            <p className="text-muted-foreground mb-6">Click "Generate Document" to see the proposal</p>
          </Card>
        )}
      </div>

      {htmlContent && (
        <div className="container mx-auto px-4 pb-8">
          <div 
            className="bg-white text-black p-8 rounded shadow-lg"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </div>
  );
};

export default ProposalView;
