import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ArrowLeft, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { TemplateDialog } from "@/components/TemplateDialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  total_value: number;
  is_active: boolean;
}

const ProposalTemplates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultTemplates = async () => {
    try {
      setLoading(true);
      
      const templates = [
        {
          name: "باقة الانطلاقة (Lite)",
          description: "15 منشور شهرياً • إدارة منصة واحدة • 15 فيديو • جلستين تصوير",
          total_value: 550,
          items: [
            { service_name: "منشور (يوم بعد يوم)", service_name_en: "Post (Every other day)", description: "إدارة منصة واحدة (انستغرام)", quantity: 15, unit_price: 0, category: "management" },
            { service_name: "مونتاج فيديو", service_name_en: "Video Editing", description: "تريند وأفكار", quantity: 15, unit_price: 15, category: "video" },
            { service_name: "جلسة تصوير", service_name_en: "Photo Session", description: "3-4 ساعات للجلسة", quantity: 2, unit_price: 150, category: "photo_session" },
            { service_name: "إدارة الردود والستوريات", service_name_en: "Replies & Stories Management", description: "إدارة يومية", quantity: 1, unit_price: 250, category: "management" }
          ]
        },
        {
          name: "باقة النمو (Growth)",
          description: "30 منشور شهرياً • إدارة 3 منصات • 15 فيديو • 15 تصميم • جلستين تصوير",
          total_value: 850,
          items: [
            { service_name: "منشور يومي", service_name_en: "Daily Post", description: "إدارة 3 منصات (IG, TikTok, FB)", quantity: 30, unit_price: 0, category: "management" },
            { service_name: "مونتاج فيديو", service_name_en: "Video Editing", description: "محتوى متنوع", quantity: 15, unit_price: 15, category: "video" },
            { service_name: "تصميم جرافيك", service_name_en: "Graphic Design", description: "بوستات احترافية", quantity: 15, unit_price: 15, category: "design" },
            { service_name: "جلسة تصوير", service_name_en: "Photo Session", description: "3-4 ساعات للجلسة", quantity: 2, unit_price: 150, category: "photo_session" },
            { service_name: "إدارة احترافية", service_name_en: "Pro Management", description: "إدارة شاملة لـ 3 منصات", quantity: 1, unit_price: 175, category: "management" }
          ]
        },
        {
          name: "الباقة المتقدمة (Premium)",
          description: "30 منشور شهرياً • إدارة منصتين • 20 فيديو • 10 تصميم • جلستين تصوير",
          total_value: 950,
          items: [
            { service_name: "منشور يومي", service_name_en: "Daily Post", description: "إدارة منصتين (IG, TikTok)", quantity: 30, unit_price: 0, category: "management" },
            { service_name: "مونتاج فيديو", service_name_en: "Video Editing", description: "تركيز أعلى على الفيديو", quantity: 20, unit_price: 15, category: "video" },
            { service_name: "تصميم جرافيك", service_name_en: "Graphic Design", description: "بوستات احترافية", quantity: 10, unit_price: 15, category: "design" },
            { service_name: "جلسة تصوير", service_name_en: "Photo Session", description: "3-4 ساعات للجلسة", quantity: 2, unit_price: 150, category: "photo_session" },
            { service_name: "إدارة احترافية", service_name_en: "Pro Management", description: "إدارة شاملة", quantity: 1, unit_price: 300, category: "management" }
          ]
        }
      ];

      for (const template of templates) {
        const { data: newTemplate, error: templateError } = await supabase
          .from('proposal_templates')
          .insert([{
            user_id: user?.id,
            name: template.name,
            description: template.description,
            total_value: template.total_value
          }])
          .select()
          .single();

        if (templateError) throw templateError;

        const items = template.items.map(item => ({
          template_id: newTemplate.id,
          ...item
        }));

        const { error: itemsError } = await supabase
          .from('template_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success('Default templates created!');
      fetchTemplates();
    } catch (error: any) {
      toast.error('Failed to create templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      const { error } = await supabase
        .from('proposal_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error: any) {
      toast.error('Failed to delete template');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Button onClick={() => navigate('/proposals')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Proposal Templates
            </h1>
            <p className="text-muted-foreground mt-2">Pre-configured service bundles for quick proposals</p>
          </div>
          <div className="flex gap-2">
            <TemplateDialog onSuccess={fetchTemplates} />
            {templates.length === 0 && (
              <Button onClick={seedDefaultTemplates} disabled={loading} size="lg" variant="outline">
                <Plus className="mr-2 h-5 w-5" />
                Create Defaults
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-6">Create your default package templates from your pricing list</p>
            <Button onClick={seedDefaultTemplates}>
              <Plus className="mr-2 h-4 w-4" />
              Create Default Templates
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="p-6 hover:shadow-medium transition-all duration-300 bg-gradient-card group hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                        ${template.total_value.toFixed(2)}
                      </Badge>
                      {template.is_active && (
                        <Badge variant="default" className="bg-success">Active</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <TemplateDialog 
                      template={template} 
                      onSuccess={fetchTemplates}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/proposals/new?templateId=${template.id}`)}
                >
                  Use Template
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalTemplates;
