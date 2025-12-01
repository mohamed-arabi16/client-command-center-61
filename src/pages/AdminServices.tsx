import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PricingCatalogItem } from "@/types/proposal";
import { Logo } from "@/components/Logo";
import { Switch } from "@/components/ui/switch";

const AdminServices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<PricingCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<PricingCatalogItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    category: "video" as PricingCatalogItem['category'],
    unit_price: "",
    notes: "",
    is_active: true
  });

  useEffect(() => {
    if (user) fetchServices();
  }, [user]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_catalog')
        .select('*')
        .eq('user_id', user?.id)
        .order('category', { ascending: true })
        .order('name_ar', { ascending: true });

      if (error) throw error;
      setServices((data || []) as PricingCatalogItem[]);
    } catch (error: any) {
      toast.error('Failed to fetch services');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        user_id: user?.id,
        name_ar: formData.name_ar,
        name_en: formData.name_en,
        description_ar: formData.description_ar || null,
        description_en: formData.description_en || null,
        category: formData.category,
        unit_price: parseFloat(formData.unit_price),
        notes: formData.notes || null,
        is_active: formData.is_active
      };

      if (editingService) {
        const { error } = await supabase
          .from('pricing_catalog')
          .update(serviceData)
          .eq('id', editingService.id);
        if (error) throw error;
        toast.success('Service updated successfully');
      } else {
        const { error } = await supabase
          .from('pricing_catalog')
          .insert([serviceData]);
        if (error) throw error;
        toast.success('Service created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error('Failed to save service');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await supabase
        .from('pricing_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Service deleted');
      fetchServices();
    } catch (error: any) {
      toast.error('Failed to delete service');
      console.error(error);
    }
  };

  const handleEdit = (service: PricingCatalogItem) => {
    setEditingService(service);
    setFormData({
      name_ar: service.name_ar,
      name_en: service.name_en,
      description_ar: service.description_ar || "",
      description_en: service.description_en || "",
      category: service.category,
      unit_price: service.unit_price.toString(),
      notes: service.notes || "",
      is_active: service.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name_ar: "",
      name_en: "",
      description_ar: "",
      description_en: "",
      category: "video",
      unit_price: "",
      notes: "",
      is_active: true
    });
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.name_en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Services Catalog</h1>
            <p className="text-muted-foreground mt-2">Manage your service offerings and pricing</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name_ar">Service Name (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      required
                      placeholder="مونتاج فيديو"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name_en">Service Name (English)</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      required
                      placeholder="Video Editing"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="package">Package</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="photo_session">Photo Session</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="ad_campaign">Ad Campaign</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="unit_price">Unit Price ($)</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                      placeholder="15.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description_ar">Description (Arabic)</Label>
                  <Textarea
                    id="description_ar"
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    placeholder="وصف تفصيلي للخدمة"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description_en">Description (English)</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    placeholder="Detailed service description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal notes (not visible to clients)"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active (available for proposals)</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingService ? 'Update' : 'Create'} Service
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 flex gap-4">
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="package">Package</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="photo_session">Photo Session</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="ad_campaign">Ad Campaign</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredServices.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No services found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || categoryFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Add your first service to get started"}
            </p>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{service.name_ar}</h3>
                      <span className="text-sm text-muted-foreground">({service.name_en})</span>
                      {!service.is_active && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground capitalize">Category: {service.category.replace('_', ' ')}</p>
                      <p className="font-semibold text-lg">${service.unit_price.toFixed(2)}</p>
                      {service.description_ar && (
                        <p className="text-muted-foreground mt-2">{service.description_ar}</p>
                      )}
                      {service.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">Note: {service.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(service.id)}>
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

export default AdminServices;
