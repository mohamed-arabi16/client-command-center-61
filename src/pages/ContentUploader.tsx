import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function ContentUploader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [clientId, setClientId] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState(['']);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [deliverableId, setDeliverableId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: deliverables } = useQuery({
    queryKey: ['deliverables', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('deliverables')
        .select('id, type, completed, total')
        .eq('client_id', clientId)
        .order('type');
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const addMediaUrl = () => {
    setMediaUrls([...mediaUrls, '']);
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const updateMediaUrl = (index: number, value: string) => {
    const updated = [...mediaUrls];
    updated[index] = value;
    setMediaUrls(updated);
  };

  const handleSaveDraft = async () => {
    if (!clientId || !caption || !mediaUrls.filter(u => u).length || platforms.length === 0) {
      toast.error('Please fill in client, caption, at least one platform, and at least one media URL');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('content_posts' as any).insert({
        client_id: clientId,
        created_by: user?.id,
        caption,
        media_urls: mediaUrls.filter(u => u),
        platforms,
        status: 'draft',
        scheduled_time: scheduledTime || null,
        deliverable_id: deliverableId || null,
      });

      if (error) throw error;
      toast.success('Draft saved successfully');
      navigate('/content-calendar');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!clientId || !caption || !mediaUrls.filter(u => u).length || platforms.length === 0 || !scheduledTime) {
      toast.error('Please fill in all required fields including scheduled time and at least one platform');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('content_posts' as any).insert({
        client_id: clientId,
        created_by: user?.id,
        caption,
        media_urls: mediaUrls.filter(u => u),
        platforms,
        status: 'pending_approval',
        scheduled_time: scheduledTime,
        deliverable_id: deliverableId || null,
      });

      if (error) throw error;
      toast.success('Post submitted for approval');
      navigate('/content-calendar');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Content Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deliverable (Optional) */}
            {deliverables && deliverables.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="deliverable">Link to Deliverable (Optional)</Label>
                <Select value={deliverableId} onValueChange={setDeliverableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deliverable (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.type} ({d.completed}/{d.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Platforms * (Select at least one)</Label>
              <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-card">
                {['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter'].map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPlatforms([...platforms, p]);
                        } else {
                          setPlatforms(platforms.filter((platform) => platform !== p));
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium capitalize text-foreground">
                      {p}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption *</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your caption here..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Media URLs (Google Drive Links) *</Label>
              {mediaUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updateMediaUrl(index, e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  {mediaUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMediaUrl(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMediaUrl}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another URL
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input
                id="scheduledTime"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                variant="outline"
              >
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmitForApproval}
                disabled={isSubmitting}
              >
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
