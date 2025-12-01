import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, ArrowLeft, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { ProposalLineItem, PricingCatalogItem } from "@/types/proposal";
import { Logo } from "@/components/Logo";

interface ProposalItemInput {
  service_id: string | null;
  service_name: string;
  service_name_en?: string;
  description: string;
  quantity: number;
  unit_price: number;
  price_at_sale: number;
  total_price: number;
  category: string;
}

const ProposalBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const templateId = searchParams.get('templateId');
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [services, setServices] = useState<PricingCatalogItem[]>([]);
  
  const standardTerms = `**تصنيف الفئة:**
- إنتاج الفيديو (المونتاج) هو من الفئة المتوسطة (Medium Tier) ويتضمن الأفكار الرائجة، الصوتيات، والترجمة - دون موشن جرافيك معقد.

**تسليم الشهر الأول:**
- العقود الجديدة: قد تصل المدة إلى 45 يوماً (وليس 30) للشهر الأول لاستيعاب الإعداد الأولي وجلسات التصوير.

**المراجعات:**
- جولتان من المراجعات مشمولة لكل مُسلّم.

**مسؤوليات العميل:**
- تقديم المواد، معلومات المنتج، والملاحظات في الوقت المناسب.
- التأخير في الموافقات قد يؤثر على الجدول الزمني للتسليم.`;

  const [formData, setFormData] = useState({
    client_id: clientId || "",
    client_name: "",
    client_contact_person: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    instagram_url: "",
    contract_duration: "monthly",
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: "",
    proposal_type: "offer",
    discount_percentage: 0,
    discount_amount: 0,
    subtotal_before_discount: 0,
    payment_type: "monthly_split" as "monthly_split" | "upfront_full" | "custom",
    notes: standardTerms,
    payment_terms: null as any,
    payment_schedule: [] as any[],
    package_tier: "custom" as "custom" | "video_foundation" | "content_engine" | "lead_generation",
    explicit_boundaries: {
      included: [] as string[],
      not_included: [] as string[]
    }
  });

  const [lineItems, setLineItems] = useState<ProposalItemInput[]>([]);
  const [aiDescription, setAiDescription] = useState("");

  useEffect(() => {
    if (user) {
      fetchServices();
      if (id) loadProposal();
      if (clientId) loadClientInfo();
      if (templateId) loadTemplate();
    }
  }, [user, id, clientId, templateId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_catalog')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name_ar', { ascending: true });

      if (error) throw error;
      setServices((data || []) as PricingCatalogItem[]);
    } catch (error: any) {
      toast.error('Failed to fetch services');
      console.error(error);
    }
  };

  const loadClientInfo = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client_name: data.name,
        client_contact_person: data.name,
        instagram_url: data.instagram_url || ""
      }));
    } catch (error: any) {
      toast.error('Failed to load client info');
      console.error(error);
    }
  };

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      const { data: template, error: templateError } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: items, error: itemsError } = await supabase
        .from('template_items')
        .select('*')
        .eq('template_id', templateId);

      if (itemsError) throw itemsError;

      // Load template items
      const templateItems = items.map(item => ({
        service_id: null,
        service_name: item.service_name,
        service_name_en: item.service_name_en || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price_at_sale: item.unit_price,
        total_price: item.quantity * item.unit_price,
        category: item.category
      }));

      setLineItems(templateItems);
      toast.success(`Template "${template.name}" loaded!`);
    } catch (error: any) {
      toast.error('Failed to load template');
      console.error(error);
    }
  };

  const loadProposal = async () => {
    try {
      setLoading(true);
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (proposalError) throw proposalError;

      setFormData({
        client_id: proposal.client_id || "",
        client_name: proposal.client_name,
        client_contact_person: proposal.client_contact_person || proposal.client_name,
        client_email: proposal.client_email || "",
        client_phone: proposal.client_phone || "",
        client_address: proposal.client_address || "",
        instagram_url: proposal.instagram_url || "",
        contract_duration: proposal.contract_duration,
        contract_start_date: proposal.contract_start_date || new Date().toISOString().split('T')[0],
        contract_end_date: proposal.contract_end_date || "",
        proposal_type: proposal.proposal_type,
        discount_percentage: proposal.discount_percentage || 0,
        discount_amount: proposal.discount_amount || 0,
        subtotal_before_discount: proposal.subtotal_before_discount || 0,
        payment_type: "monthly_split",
        notes: proposal.notes || standardTerms,
        payment_terms: proposal.payment_terms,
        payment_schedule: Array.isArray(proposal.payment_schedule) ? proposal.payment_schedule : [],
        package_tier: (proposal.package_tier as any) || "custom",
        explicit_boundaries: (proposal.explicit_boundaries as any) || { included: [], not_included: [] }
      });

      // Load proposal items
      const { data: items, error: itemsError } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', id);

      if (itemsError) throw itemsError;

      setLineItems(items.map(item => ({
        service_id: item.service_id,
        service_name: item.service_name,
        service_name_en: item.service_name_en || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price_at_sale: item.price_at_sale,
        total_price: item.total_price,
        category: item.category
      })));
    } catch (error: any) {
      toast.error('Failed to load proposal');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      service_id: null,
      service_name: "",
      service_name_en: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      price_at_sale: 0,
      total_price: 0,
      category: "other"
    }]);
  };

  const updateLineItem = (index: number, field: keyof ProposalItemInput, value: any) => {
    const updated = [...lineItems];
    
    if (field === 'service_id' && value) {
      // Auto-fill from service catalog
      const service = services.find(s => s.id === value);
      if (service) {
        updated[index] = {
          ...updated[index],
          service_id: service.id,
          service_name: service.name_ar,
          service_name_en: service.name_en,
          description: service.description_ar || service.name_ar,
          unit_price: Number(service.unit_price),
          price_at_sale: Number(service.unit_price),
          category: service.category
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    // Recalculate total
    updated[index].total_price = updated[index].quantity * updated[index].price_at_sale;
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const getAISuggestion = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please enter a client description');
      return;
    }

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: { client_description: aiDescription }
      });

      if (error) throw error;

      if (data.success && data.data.suggested_items) {
        const suggestions = data.data.suggested_items.map((item: any) => {
          const matchedService = services.find(s => 
            s.name_ar === item.service_name || s.name_en === item.service_name_en
          );
          
          return {
            service_id: matchedService?.id || null,
            service_name: item.service_name,
            service_name_en: item.service_name_en,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_at_sale: item.unit_price,
            total_price: item.total_price,
            category: item.category
          };
        });
        
        setLineItems(suggestions);
        toast.success('AI suggestions loaded!');
        if (data.data.reasoning) {
          toast.info(data.data.reasoning);
        }
      }
    } catch (error: any) {
      toast.error('Failed to get AI suggestion');
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateContractEndDate = (startDate: string, duration: string) => {
    if (!startDate) return "";
    const start = new Date(startDate);
    switch (duration) {
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() + 3);
        break;
      case 'semi-annual':
        start.setMonth(start.getMonth() + 6);
        break;
      case 'annual':
        start.setFullYear(start.getFullYear() + 1);
        break;
    }
    return start.toISOString().split('T')[0];
  };

  const getMonthsCount = (duration: string) => {
    switch (duration) {
      case 'monthly': return 1;
      case 'quarterly': return 3;
      case 'semi-annual': return 6;
      case 'annual': return 12;
      default: return 1;
    }
  };

  const calculateTotal = () => {
    const monthlySubtotal = calculateSubtotal();
    const months = getMonthsCount(formData.contract_duration);
    const subtotalBefore = monthlySubtotal * months;
    const clampedDiscount = Math.max(0, Math.min(15, formData.discount_percentage));
    const discountAmount = months >= 3 && clampedDiscount > 0
      ? (subtotalBefore * clampedDiscount) / 100
      : 0;
    return subtotalBefore - discountAmount;
  };

  const generatePaymentSchedule = () => {
    const total = calculateTotal();
    const startDate = new Date(formData.contract_start_date);
    const schedule: any[] = [];

    if (formData.payment_type === 'monthly_split') {
      schedule.push({
        installment: 1,
        amount: total * 0.5,
        due_date: startDate.toISOString().split('T')[0],
        status: 'pending'
      });
      const secondPayment = new Date(startDate);
      secondPayment.setDate(secondPayment.getDate() + 15);
      schedule.push({
        installment: 2,
        amount: total * 0.5,
        due_date: secondPayment.toISOString().split('T')[0],
        status: 'pending'
      });
    } else if (formData.payment_type === 'upfront_full') {
      schedule.push({
        installment: 1,
        amount: total,
        due_date: startDate.toISOString().split('T')[0],
        status: 'pending'
      });
    }

    return schedule;
  };

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (formData.contract_start_date && formData.contract_duration) {
      const endDate = calculateContractEndDate(formData.contract_start_date, formData.contract_duration);
      setFormData(prev => ({ ...prev, contract_end_date: endDate }));
    }
  }, [formData.contract_start_date, formData.contract_duration]);

  // Auto-calculate discount and payment schedule when values change
  useEffect(() => {
    const monthlySubtotal = calculateSubtotal();
    const months = getMonthsCount(formData.contract_duration);
    const subtotalBefore = monthlySubtotal * months;
    const clampedDiscount = Math.max(0, Math.min(15, formData.discount_percentage));
    const discountAmount = months >= 3 && clampedDiscount > 0
      ? (subtotalBefore * clampedDiscount) / 100
      : 0;
    
    setFormData(prev => ({
      ...prev,
      subtotal_before_discount: subtotalBefore,
      discount_amount: discountAmount,
      payment_schedule: generatePaymentSchedule()
    }));
  }, [lineItems, formData.discount_percentage, formData.payment_type, formData.contract_start_date, formData.contract_duration]);

  const saveProposal = async (status: 'draft' | 'sent') => {
    if (!formData.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (!formData.client_contact_person.trim()) {
      toast.error('Contact person name is required');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Add at least one service');
      return;
    }

    setLoading(true);
    try {
      const proposalData = {
        user_id: user?.id,
        client_id: formData.client_id || null,
        client_name: formData.client_name,
        client_contact_person: formData.client_contact_person,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        client_address: formData.client_address || null,
        instagram_url: formData.instagram_url || null,
        status,
        proposal_type: formData.proposal_type,
        total_value: calculateTotal(),
        subtotal_before_discount: formData.subtotal_before_discount,
        discount_percentage: formData.discount_percentage,
        discount_amount: formData.discount_amount,
        contract_duration: formData.contract_duration,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        payment_terms: formData.payment_terms,
        payment_schedule: formData.payment_schedule,
        notes: formData.notes || null,
        line_items: [], // Keep empty for backward compatibility
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        package_tier: formData.package_tier || null,
        explicit_boundaries: formData.explicit_boundaries,
      };

      let proposalId = id;

      if (id) {
        // Update existing proposal
        const { error } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', id);
        
        if (error) throw error;

        // Delete existing items and insert new ones
        await supabase
          .from('proposal_items')
          .delete()
          .eq('proposal_id', id);
      } else {
        // Create new proposal
        const { data, error } = await supabase
          .from('proposals')
          .insert([proposalData])
          .select()
          .single();
        
        if (error) throw error;
        proposalId = data.id;
      }

      // Insert line items into proposal_items table
      const itemsToInsert = lineItems.map(item => ({
        proposal_id: proposalId,
        service_id: item.service_id,
        service_name: item.service_name,
        service_name_en: item.service_name_en || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price_at_sale: item.price_at_sale,
        total_price: item.total_price,
        category: item.category
      }));

      const { error: itemsError } = await supabase
        .from('proposal_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(id ? 'Proposal updated' : 'Proposal created');
      navigate('/proposals');
    } catch (error: any) {
      toast.error('Failed to save proposal');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Button variant="outline" onClick={() => navigate('/proposals')}>Back to Proposals</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">{id ? 'Edit' : 'New'} Proposal</h1>

        {/* Client Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Client Information</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Company Name *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Company or business name"
                />
              </div>
              <div>
                <Label htmlFor="client_contact_person">Contact Person Name *</Label>
                <Input
                  id="client_contact_person"
                  value={formData.client_contact_person}
                  onChange={(e) => setFormData({ ...formData, client_contact_person: e.target.value })}
                  placeholder="Name of the person to contact"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="client_phone">Phone</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="client_address">Address</Label>
              <Input
                id="client_address"
                value={formData.client_address}
                onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* AI Assistant */}
        <Card className="p-6 mb-6 bg-primary/5">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Pricing Assistant
          </h2>
          <p className="text-muted-foreground mb-4">Describe the client's needs in Arabic or English, or use a template</p>
          <div className="flex gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/proposals/templates')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Browse Templates
            </Button>
          </div>
          <Textarea
            placeholder="مثال: العميل يريد إدارة انستغرام وتيك توك مع 30 بوست شهرياً و 20 فيديو و جلستين تصوير..."
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            rows={4}
            className="mb-4"
          />
          <Button onClick={getAISuggestion} disabled={loadingAI}>
            {loadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Get AI Suggestion
          </Button>
        </Card>

        {/* Line Items */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Services</h2>
            <Button onClick={addLineItem} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>

              {lineItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No services added yet. Use AI assistant or add manually.</p>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Select Service</Label>
                        <Select
                          value={item.service_id || "custom"}
                          onValueChange={(value) => {
                            if (value === "custom") {
                              updateLineItem(index, 'service_id', null);
                            } else {
                              updateLineItem(index, 'service_id', value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose from catalog or custom" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Custom Service</SelectItem>
                            {services.map(service => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name_ar} - ${service.unit_price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input value={item.category} disabled className="bg-muted" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Service Name (Arabic)</Label>
                        <Input
                          placeholder="اسم الخدمة"
                          value={item.service_name}
                          onChange={(e) => updateLineItem(index, 'service_name', e.target.value)}
                          required
                          disabled={!!item.service_id}
                        />
                      </div>
                      <div>
                        <Label>Service Name (English)</Label>
                        <Input
                          placeholder="Service Name"
                          value={item.service_name_en || ""}
                          onChange={(e) => updateLineItem(index, 'service_name_en', e.target.value)}
                          disabled={!!item.service_id}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        required
                        rows={2}
                        disabled={!!item.service_id}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          required
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>Price at Sale</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.price_at_sale}
                          onChange={(e) => updateLineItem(index, 'price_at_sale', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Line Total</Label>
                        <Input
                          value={`$${item.total_price.toFixed(2)}`}
                          disabled
                          className="bg-muted font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal ({getMonthsCount(formData.contract_duration)} month{getMonthsCount(formData.contract_duration) > 1 ? 's' : ''}):</span>
                <span className="font-semibold">${formData.subtotal_before_discount.toFixed(2)}</span>
              </div>
              {getMonthsCount(formData.contract_duration) >= 3 && formData.discount_percentage > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Discount ({formData.discount_percentage}%):</span>
                  <span className="font-semibold">-${formData.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-2xl font-bold pt-2 border-t">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Package Tier & Boundaries */}
        <Card className="p-6 mb-6 bg-muted/30">
          <h2 className="text-2xl font-semibold mb-4">Package Type & Boundaries</h2>
          <div className="space-y-4">
            <div>
              <Label>Package Tier (Optional)</Label>
              <Select
                value={formData.package_tier}
                onValueChange={(value: any) => setFormData({ ...formData, package_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package type or leave custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Package</SelectItem>
                  <SelectItem value="video_foundation">Video Content Foundation ($650)</SelectItem>
                  <SelectItem value="content_engine">Content Engine ($1,250)</SelectItem>
                  <SelectItem value="lead_generation">Lead Generation ($1,750)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>What's Included (comma separated)</Label>
                <Textarea
                  placeholder="Community management, Video editing, GMB optimization..."
                  value={formData.explicit_boundaries.included.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    explicit_boundaries: {
                      ...formData.explicit_boundaries,
                      included: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  rows={3}
                />
              </div>
              <div>
                <Label>What's NOT Included (comma separated)</Label>
                <Textarea
                  placeholder="Custom video production, Multiple photo sessions..."
                  value={formData.explicit_boundaries.not_included.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    explicit_boundaries: {
                      ...formData.explicit_boundaries,
                      not_included: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contract Dates & Duration */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Contract Dates & Duration</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contract_start_date">Start Date *</Label>
                <Input
                  id="contract_start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contract_duration">Duration *</Label>
                <Select
                  value={formData.contract_duration}
                  onValueChange={(value) => setFormData({ ...formData, contract_duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">1 Month</SelectItem>
                    <SelectItem value="quarterly">3 Months</SelectItem>
                    <SelectItem value="semi-annual">6 Months</SelectItem>
                    <SelectItem value="annual">12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contract_end_date">End Date (Auto)</Label>
                <Input
                  id="contract_end_date"
                  type="date"
                  value={formData.contract_end_date}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Discount (Multi-Month Only) */}
        {getMonthsCount(formData.contract_duration) >= 3 && (
          <Card className="p-6 mb-6 bg-primary/5">
            <h2 className="text-2xl font-semibold mb-4">Multi-Month Discount</h2>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Contracts of 3+ months are eligible for discounts (10-25%)
              </p>
              <div>
                <Label htmlFor="discount_percentage">Discount Percentage (10-25%)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  step="1"
                  min="10"
                  max="25"
                  value={formData.discount_percentage}
                  onChange={(e) => {
                    const months = getMonthsCount(formData.contract_duration);
                    const inputValue = Number(e.target.value) || 0;
                    // Allow 0 for non-eligible contracts, otherwise clamp to 10-25
                    const value = months >= 3 && inputValue > 0 
                      ? Math.max(10, Math.min(25, inputValue))
                      : inputValue === 0 ? 0 : Math.max(10, Math.min(25, inputValue));
                    setFormData({ ...formData, discount_percentage: value });
                  }}
                />
              </div>
              {formData.discount_percentage > 0 && (
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Discount Breakdown:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly Price:</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{getMonthsCount(formData.contract_duration)} months</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>${formData.subtotal_before_discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Discount ({formData.discount_percentage}%):</span>
                      <span>-${formData.discount_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Payment Terms */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Payment Terms</h2>
          <div className="space-y-4">
            <div>
              <Label>Payment Schedule</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(value: any) => setFormData({ ...formData, payment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_split">Monthly Split (50/50)</SelectItem>
                  <SelectItem value="upfront_full">Full Upfront Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payment_schedule.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3">Payment Schedule:</h4>
                <div className="space-y-2">
                  {formData.payment_schedule.map((payment: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>Payment {payment.installment} ({payment.installment === 1 ? '50%' : '50%'})</span>
                      <div className="text-right">
                        <div className="font-semibold">${payment.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Due: {payment.due_date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Notes & Terms */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Standard Terms & Conditions</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="notes">Terms (pre-filled, editable)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={10}
                placeholder="Standard terms and conditions..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                These terms are pre-filled from your pricing list. You can edit them as needed.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => saveProposal('draft')}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => saveProposal('sent')}
            disabled={loading}
            size="lg"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save & Mark as Sent
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProposalBuilder;
