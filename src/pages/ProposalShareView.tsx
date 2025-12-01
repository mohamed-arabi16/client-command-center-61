import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PublicProposal {
  id: string;
  user_id: string;
  client_id?: string;
  client_name: string;
  client_contact_person?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  instagram_url?: string;
  status: string;
  proposal_type: string;
  total_value: number;
  subtotal_before_discount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  contract_duration: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_number?: string;
  line_items: any[];
  payment_terms?: any;
  payment_schedule?: Array<{
    installment: number;
    amount: number;
    due_date: string;
    status: string;
  }>;
  notes?: string;
  created_at: string;
  sent_at?: string;
  accepted_at?: string;
}

const ProposalShareView = () => {
  const { token } = useParams();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      loadProposal();
    }
  }, [token]);

  const loadProposal = async () => {
    try {
      const { data: proposalData, error: proposalError } = await supabase
        .rpc('get_proposal_by_share_token', { share_token: token });

      if (proposalError) throw proposalError;
      
      if (proposalData && proposalData.length > 0) {
        const proposal = proposalData[0];
        
        // Fetch proposal items
        const { data: items, error: itemsError } = await supabase
          .from('proposal_items')
          .select('*')
          .eq('proposal_id', proposal.id);

        if (itemsError) throw itemsError;

        setProposal({
          ...proposal,
          line_items: items || []
        } as any as PublicProposal);
      }
    } catch (error: any) {
      toast.error('Failed to load proposal');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const acceptProposal = async () => {
    if (!proposal) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-proposal', {
        body: { 
          proposal_id: proposal.id,
          share_token: token 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Proposal accepted! We will contact you shortly.');
        setProposal({ ...proposal, status: 'accepted' });
      } else {
        throw new Error(data.error || 'Failed to accept proposal');
      }
    } catch (error: any) {
      toast.error('Failed to accept proposal');
      console.error(error);
    } finally {
      setAccepting(false);
    }
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
        <p className="text-muted-foreground">Proposal not found</p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const downloadContract = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Contract - ' + proposal.client_name + '</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;} .header{text-align:center;margin-bottom:30px;} table{width:100%;border-collapse:collapse;margin:20px 0;} th,td{border:1px solid #ddd;padding:12px;text-align:left;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="header"><h1>Service Agreement</h1><h2>' + proposal.client_name + '</h2></div>');
    printWindow.document.write('<p><strong>Contract Period:</strong> ' + formatDate(proposal.contract_start_date) + ' - ' + formatDate(proposal.contract_end_date) + '</p>');
    printWindow.document.write('<h3>Services</h3><table><thead><tr><th>Service</th><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>');
    
    proposal.line_items.forEach((item: any) => {
      printWindow.document.write('<tr><td>' + item.service_name + '</td><td>' + item.description + '</td><td>' + item.quantity + '</td><td>$' + item.unit_price.toFixed(2) + '</td><td>$' + item.total_price.toFixed(2) + '</td></tr>');
    });
    
    if (proposal.discount_amount && proposal.discount_amount > 0) {
      printWindow.document.write('<tr><td colspan="4" style="text-align:right;"><strong>Subtotal:</strong></td><td>$' + (proposal.subtotal_before_discount || 0).toFixed(2) + '</td></tr>');
      printWindow.document.write('<tr><td colspan="4" style="text-align:right;"><strong>Discount (' + (proposal.discount_percentage || 0) + '%):</strong></td><td style="color:red;">-$' + proposal.discount_amount.toFixed(2) + '</td></tr>');
    }
    
    printWindow.document.write('<tr><td colspan="4" style="text-align:right;"><strong>TOTAL:</strong></td><td><strong>$' + proposal.total_value.toFixed(2) + '</strong></td></tr>');
    printWindow.document.write('</tbody></table>');
    
    if (proposal.payment_schedule && proposal.payment_schedule.length > 0) {
      printWindow.document.write('<h3>Payment Schedule</h3><table><thead><tr><th>Installment</th><th>Amount</th><th>Due Date</th></tr></thead><tbody>');
      proposal.payment_schedule.forEach((payment: any) => {
        printWindow.document.write('<tr><td>Payment ' + payment.installment + '</td><td>$' + payment.amount.toFixed(2) + '</td><td>' + formatDate(payment.due_date) + '</td></tr>');
      });
      printWindow.document.write('</tbody></table>');
    }
    
    if (proposal.notes) {
      printWindow.document.write('<h3>Terms & Conditions</h3><div style="white-space:pre-wrap;">' + proposal.notes + '</div>');
    }
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
        <Card className="p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">
              {proposal.client_name}
              {proposal.client_contact_person && (
                <span className="block text-lg sm:text-xl text-muted-foreground mt-2">
                  Attn: {proposal.client_contact_person}
                </span>
              )}
            </h1>
            {proposal.contract_start_date && proposal.contract_end_date && (
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Contract Period: {formatDate(proposal.contract_start_date)} - {formatDate(proposal.contract_end_date)}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {/* Services Section */}
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Services Included</h2>
              <div className="space-y-3">
                {proposal.line_items.map((item: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:justify-between p-4 bg-muted rounded gap-2">
                    <div className="flex-1">
                      <p className="font-semibold">{item.service_name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-sm mt-1">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-lg">${item.total_price.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">${item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="border-t pt-6 space-y-2">
              {proposal.discount_amount && proposal.discount_amount > 0 && (
                <>
                  <div className="flex justify-between text-base sm:text-lg">
                    <span>Subtotal:</span>
                    <span>${(proposal.subtotal_before_discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base sm:text-lg text-red-600">
                    <span>Discount ({proposal.discount_percentage}%):</span>
                    <span>-${proposal.discount_amount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xl sm:text-2xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${proposal.total_value.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Schedule */}
            {proposal.payment_schedule && proposal.payment_schedule.length > 0 && (
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3">Payment Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2 sm:p-3 text-left text-sm sm:text-base">Installment</th>
                        <th className="border p-2 sm:p-3 text-left text-sm sm:text-base">Amount</th>
                        <th className="border p-2 sm:p-3 text-left text-sm sm:text-base">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.payment_schedule.map((payment, index) => (
                        <tr key={index}>
                          <td className="border p-2 sm:p-3 text-sm sm:text-base">Payment {payment.installment}</td>
                          <td className="border p-2 sm:p-3 text-sm sm:text-base font-semibold">${payment.amount.toFixed(2)}</td>
                          <td className="border p-2 sm:p-3 text-sm sm:text-base">{formatDate(payment.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {proposal.notes && (
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3">Terms & Conditions</h3>
                <div className="bg-muted p-4 rounded text-sm sm:text-base">
                  <p className="whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
              {proposal.status === 'accepted' || proposal.status === 'sent' || proposal.status === 'active' ? (
                <>
                  <div className="text-center w-full sm:w-auto">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-base sm:text-lg font-semibold text-green-600">Proposal Accepted</p>
                    <p className="text-sm text-muted-foreground">We will contact you shortly to proceed.</p>
                  </div>
                  <Button onClick={downloadContract} variant="outline" size="lg" className="w-full sm:w-auto">
                    Download Contract
                  </Button>
                </>
              ) : (
                <Button onClick={acceptProposal} disabled={accepting} size="lg" className="w-full sm:w-auto min-h-[48px]">
                  {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Accept Proposal
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProposalShareView;
