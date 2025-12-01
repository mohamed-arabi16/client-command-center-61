import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, RefreshCw, XCircle } from 'lucide-react';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export const ShareLinkDialog = ({ open, onOpenChange, clientId }: ShareLinkDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchOrCreateLink();
    }
  }, [open, clientId]);

  const fetchOrCreateLink = async () => {
    setLoading(true);
    try {
      // Check if link already exists
      const { data: existing } = await supabase
        .from('shareable_links')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (existing) {
        setShareLink(existing);
      } else {
        // Create new link
        const token = crypto.randomUUID();
        const { data: newLink, error } = await supabase
          .from('shareable_links')
          .insert({
            client_id: clientId,
            token: token,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        setShareLink(newLink);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create shareable link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/share/${shareLink.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const deactivateLink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shareable_links')
        .update({ is_active: false })
        .eq('id', shareLink.id);

      if (error) throw error;

      toast.success('Link deactivated');
      setShareLink(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate link');
    } finally {
      setLoading(false);
    }
  };

  const regenerateLink = async () => {
    setLoading(true);
    try {
      // Deactivate old link
      if (shareLink) {
        await supabase
          .from('shareable_links')
          .update({ is_active: false })
          .eq('id', shareLink.id);
      }

      // Create new link
      const token = crypto.randomUUID();
      const { data: newLink, error } = await supabase
        .from('shareable_links')
        .insert({
          client_id: clientId,
          token: token,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setShareLink(newLink);
      toast.success('New link generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate link');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = shareLink ? `${window.location.origin}/share/${shareLink.token}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with Client</DialogTitle>
          <DialogDescription>
            Share this link with your client for read-only access to their project progress
          </DialogDescription>
        </DialogHeader>

        {loading && !shareLink ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : shareLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  disabled={loading}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={regenerateLink}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Link
              </Button>
              <Button
                variant="destructive"
                onClick={deactivateLink}
                disabled={loading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deactivate Link
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This link will remain active until you deactivate it. Anyone with this link can view the client's progress.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
