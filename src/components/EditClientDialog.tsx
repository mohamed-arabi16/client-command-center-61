import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Instagram, Loader2 } from 'lucide-react';
import { extractInstagramHandle } from '@/utils/instagram';

const clientSchema = z.object({
  instagram_url: z.string().optional(),
  instagram_profile_pic_url: z.string().optional(),
  instagram_bio: z.string().optional(),
  instagram_follower_count: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  contract_type: z.string().min(1, 'Contract type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  status: z.enum(['active', 'paused', 'completed']),
  total_contract_value: z.string().optional(),
  payment_terms: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  currentData: any;
  onClientUpdated: () => void;
}

export const EditClientDialog = ({ open, onOpenChange, clientId, currentData, onClientUpdated }: EditClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [fetchingInstagram, setFetchingInstagram] = useState(false);
  const [instagramData, setInstagramData] = useState<any>(null);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      instagram_url: currentData?.instagram_url || '',
      instagram_profile_pic_url: currentData?.instagram_profile_pic_url || '',
      instagram_bio: currentData?.instagram_bio || '',
      instagram_follower_count: currentData?.instagram_follower_count?.toString() || '',
      name: currentData?.name || '',
      contract_type: currentData?.contract_type || 'Monthly Retainer',
      start_date: currentData?.start_date || '',
      status: currentData?.status || 'active',
      total_contract_value: currentData?.total_contract_value?.toString() || '',
      payment_terms: currentData?.payment_terms?.notes || '',
    },
  });

  useEffect(() => {
    if (currentData) {
      form.reset({
        instagram_url: currentData.instagram_url || '',
        instagram_profile_pic_url: currentData.instagram_profile_pic_url || '',
        instagram_bio: currentData.instagram_bio || '',
        instagram_follower_count: currentData.instagram_follower_count?.toString() || '',
        name: currentData.name,
        contract_type: currentData.contract_type,
        start_date: currentData.start_date,
        status: currentData.status,
        total_contract_value: currentData.total_contract_value?.toString() || '',
        payment_terms: currentData.payment_terms?.notes || '',
      });
      
      // Set existing Instagram data if available
      if (currentData.instagram_handle) {
        setInstagramData({
          handle: currentData.instagram_handle,
          profile_pic_url: currentData.instagram_profile_pic_url,
          bio: currentData.instagram_bio,
          follower_count: currentData.instagram_follower_count,
        });
      }
    }
  }, [currentData, form]);

  const handleFetchInstagram = async () => {
    const instagramUrl = form.getValues('instagram_url');
    if (!instagramUrl) {
      toast.error('Please enter an Instagram URL or username');
      return;
    }

    const handle = extractInstagramHandle(instagramUrl);
    if (!handle) {
      toast.error('Invalid Instagram URL or username');
      return;
    }

    setFetchingInstagram(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-instagram', {
        body: { instagram_handle: handle }
      });

      if (error) throw error;

      if (data?.success) {
        const profileData = data.data;
        setInstagramData({
          handle,
          profile_pic_url: profileData.profile_pic_url,
          bio: profileData.bio,
          follower_count: profileData.follower_count,
          full_name: profileData.full_name,
        });

        toast.success(`Instagram profile refreshed: @${handle}`);
      } else {
        throw new Error(data?.error || 'Failed to fetch Instagram profile');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to fetch Instagram profile';
      toast.error(errorMsg, {
        description: 'You can manually enter Instagram data in the fields below.',
        duration: 5000,
      });
      console.error('Instagram fetch error:', error);
    } finally {
      setFetchingInstagram(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    try {
      const updateData: any = {
        name: data.name,
        contract_type: data.contract_type,
        start_date: data.start_date,
        status: data.status,
        total_contract_value: data.total_contract_value ? parseFloat(data.total_contract_value) : null,
        payment_terms: data.payment_terms ? { notes: data.payment_terms } : null,
      };

      // Add Instagram data - prefer API data if available, otherwise use manual input
      if (data.instagram_url) {
        updateData.instagram_url = data.instagram_url;
        const handle = extractInstagramHandle(data.instagram_url);
        updateData.instagram_handle = instagramData?.handle || handle;
        
        // Use API data if available, otherwise use manual input from form
        updateData.instagram_profile_pic_url = instagramData?.profile_pic_url || data.instagram_profile_pic_url || null;
        updateData.instagram_bio = instagramData?.bio || data.instagram_bio || null;
        updateData.instagram_follower_count = instagramData?.follower_count || 
          (data.instagram_follower_count ? parseInt(data.instagram_follower_count) : null);
        
        if (instagramData || data.instagram_profile_pic_url || data.instagram_bio || data.instagram_follower_count) {
          updateData.instagram_scraped_at = new Date().toISOString();
        }
      } else {
        // Clear Instagram data if URL is removed
        updateData.instagram_url = null;
        updateData.instagram_handle = null;
        updateData.instagram_profile_pic_url = null;
        updateData.instagram_bio = null;
        updateData.instagram_follower_count = null;
        updateData.instagram_scraped_at = null;
      }

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Client updated successfully!');
      onOpenChange(false);
      onClientUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the client details
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Instagram className="h-4 w-4" />
                Instagram Profile (Optional)
              </div>
              <FormField
                control={form.control}
                name="instagram_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram URL or Username</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="@username or https://instagram.com/username" 
                          {...field} 
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFetchInstagram}
                        disabled={fetchingInstagram || !field.value}
                        className="shrink-0"
                      >
                        {fetchingInstagram ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <Instagram className="h-4 w-4 mr-2" />
                            Refresh
                          </>
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {instagramData && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                  <img 
                    src={instagramData.profile_pic_url} 
                    alt={instagramData.handle}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">@{instagramData.handle}</p>
                    {instagramData.follower_count && (
                      <p className="text-xs text-muted-foreground">
                        {instagramData.follower_count.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Manual Instagram Data Entry */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  If auto-fetch doesn't work, you can manually enter Instagram data:
                </p>
                <FormField
                  control={form.control}
                  name="instagram_profile_pic_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Profile Picture URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/profile.jpg" 
                          {...field} 
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram_bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter Instagram bio..." 
                          {...field} 
                          className="text-sm resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram_follower_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Follower Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="e.g. 10000" 
                          {...field} 
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contract_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Monthly Retainer">Monthly Retainer</SelectItem>
                      <SelectItem value="3-Month Retainer">3-Month Retainer</SelectItem>
                      <SelectItem value="6-Month Retainer">6-Month Retainer</SelectItem>
                      <SelectItem value="Project-Based">Project-Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="total_contract_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Contract Value (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter payment terms and schedule..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
