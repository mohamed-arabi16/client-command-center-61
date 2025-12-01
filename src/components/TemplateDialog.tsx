import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TemplateItem {
  service_name: string;
  service_name_en: string;
  description: string;
  quantity: number;
  unit_price: number;
  category: string;
}

interface TemplateDialogProps {
  template?: any;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const TemplateDialog = ({ template, onSuccess, trigger }: TemplateDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchServices();
      if (template) {
        setName(template.name);
        setDescription(template.description || "");
        fetchTemplateItems();
      }
    }
  }, [open, template]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('pricing_catalog')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true);
    setServices(data || []);
  };

  const fetchTemplateItems = async () => {
    if (!template) return;
    const { data } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', template.id);
    setItems(data || []);
  };

  const addItem = () => {
    setItems([...items, {
      service_name: "",
      service_name_en: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      category: "other"
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectService = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      updateItem(index, 'service_name', service.name_ar);
      updateItem(index, 'service_name_en', service.name_en);
      updateItem(index, 'description', service.description_ar || "");
      updateItem(index, 'unit_price', service.unit_price);
      updateItem(index, 'category', service.category);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setLoading(true);
    try {
      const totalValue = calculateTotal();

      if (template) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('proposal_templates')
          .update({ name, description, total_value: totalValue })
          .eq('id', template.id);

        if (templateError) throw templateError;

        // Delete old items and insert new ones
        await supabase.from('template_items').delete().eq('template_id', template.id);
      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('proposal_templates')
          .insert([{ user_id: user?.id, name, description, total_value: totalValue }])
          .select()
          .single();

        if (templateError) throw templateError;
        template = newTemplate;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          template_id: template.id,
          ...item
        }));

        const { error: itemsError } = await supabase
          .from('template_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success(template ? 'Template updated' : 'Template created');
      setOpen(false);
      setName("");
      setDescription("");
      setItems([]);
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to save template');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Premium Package"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Services</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <Select onValueChange={(value) => selectService(index, value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select service from catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name_ar} - ${service.unit_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Service Name (AR)</Label>
                    <Input
                      value={item.service_name}
                      onChange={(e) => updateItem(index, 'service_name', e.target.value)}
                      placeholder="Arabic name"
                    />
                  </div>
                  <div>
                    <Label>Service Name (EN)</Label>
                    <Input
                      value={item.service_name_en}
                      onChange={(e) => updateItem(index, 'service_name_en', e.target.value)}
                      placeholder="English name"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Service description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Unit Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input
                      type="text"
                      value={`$${(item.quantity * item.unit_price).toFixed(2)}`}
                      disabled
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Template Total: ${calculateTotal().toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
