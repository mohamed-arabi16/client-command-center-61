import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Instagram, Loader2 } from 'lucide-react';
import { extractInstagramHandle } from '@/utils/instagram';

const clientSchema = z.object({
  instagram_url: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  contract_type: z.string().min(1, 'Contract type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  status: z.enum(['active', 'paused', 'completed']),
  total_contract_value: z.string().optional(),
  payment_terms: z.string().optional(),
  business_type: z.string().optional(),
  primary_goal: z.string().optional(),
  estimated_close_rate: z.string().optional(),
  average_customer_value: z.string().optional(),
  primary_lead_source: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  onClientAdded: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddClientDialog = ({ onClientAdded, open: controlledOpen, onOpenChange }: AddClientDialogProps) => {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [fetchingInstagram, setFetchingInstagram] = useState(false);
  const [instagramData, setInstagramData] = useState<any>(null);
  const { user } = useAuth();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      instagram_url: '',
      name: '',
      contract_type: 'Monthly Retainer',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      total_contract_value: '',
      payment_terms: '',
      business_type: '',
      primary_goal: '',
      estimated_close_rate: '20',
      average_customer_value: '',
      primary_lead_source: '',
    },
  });

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

        // Auto-populate name if not already filled
        if (!form.getValues('name') && profileData.full_name) {
          form.setValue('name', profileData.full_name);
        }

        toast.success(`Instagram profile loaded: @${handle}`);
      } else {
        throw new Error(data?.error || 'Failed to fetch Instagram profile');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to fetch Instagram profile';
      toast.error(errorMsg, {
        description: 'You can manually enter Instagram data in the Edit Client dialog.',
        duration: 5000,
      });
      console.error('Instagram fetch error:', error);
    } finally {
      setFetchingInstagram(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const clientData: any = {
        user_id: user.id,
        name: data.name,
        contract_type: data.contract_type,
        start_date: data.start_date,
        status: data.status,
        total_contract_value: data.total_contract_value ? parseFloat(data.total_contract_value) : null,
        payment_terms: data.payment_terms ? { notes: data.payment_terms } : null,
        business_type: data.business_type || null,
        primary_goal: data.primary_goal || null,
        estimated_close_rate: data.estimated_close_rate ? parseFloat(data.estimated_close_rate) : 20,
        average_customer_value: data.average_customer_value ? parseFloat(data.average_customer_value) : null,
        primary_lead_source: data.primary_lead_source || null,
      };

      // Add Instagram data if available
      if (data.instagram_url) {
        clientData.instagram_url = data.instagram_url;
        if (instagramData) {
          clientData.instagram_handle = instagramData.handle;
          clientData.instagram_profile_pic_url = instagramData.profile_pic_url;
          clientData.instagram_bio = instagramData.bio;
          clientData.instagram_follower_count = instagramData.follower_count;
          clientData.instagram_scraped_at = new Date().toISOString();
          // Use Instagram profile pic as logo if no logo is set
          if (!clientData.logo_url) {
            clientData.logo_url = instagramData.profile_pic_url;
          }
        }
      }

      const { data: newClient, error } = await supabase.from('clients').insert(clientData).select().single();

      if (error) throw error;

      toast.success('Client added successfully! Now create a proposal.');
      setOpen(false);
      form.reset();
      setInstagramData(null);
      onClientAdded();
      navigate(`/proposals/new?clientId=${newClient.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client details to create a new client profile
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
                            Fetch Profile
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm font-medium text-muted-foreground">
                Business Intelligence Settings (Optional)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="business_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="car_rental">Car Rental</SelectItem>
                          <SelectItem value="beauty_salon">Beauty Salon</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="service_provider">Service Provider</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Goal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="leads">Generate Leads</SelectItem>
                          <SelectItem value="bookings">Increase Bookings</SelectItem>
                          <SelectItem value="foot_traffic">Drive Foot Traffic</SelectItem>
                          <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimated_close_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Close Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="average_customer_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avg. Customer Value ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="primary_lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gmb">Google My Business</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="referrals">Referrals</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Client'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
