import { useState, useEffect } from 'react';
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
import { Plus } from 'lucide-react';

const activitySchema = z.object({
  type: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required').max(500),
  deliverable_type: z.string().optional(),
  quantity: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface AddActivityDialogProps {
  clientId: string;
  onActivityAdded: () => void;
}

export const AddActivityDialog = ({ clientId, onActivityAdded }: AddActivityDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const { user } = useAuth();

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'Content Published',
      description: '',
      deliverable_type: '',
      quantity: '1',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedDeliverableType = form.watch('deliverable_type');

  useEffect(() => {
    if (open) {
      fetchDeliverables();
    }
  }, [open, clientId]);

  const fetchDeliverables = async () => {
    const { data } = await supabase
      .from('deliverables')
      .select('*')
      .eq('client_id', clientId);
    
    if (data) {
      setDeliverables(data);
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Insert activity
      const { error: activityError } = await supabase.from('activities').insert({
        client_id: clientId,
        type: data.type,
        description: data.description,
        deliverable_type: data.deliverable_type || null,
        date: data.date,
        created_by: user.id,
      });

      if (activityError) throw activityError;

      // If a deliverable is selected, increment its completed count
      if (data.deliverable_type && data.quantity) {
        const quantity = parseInt(data.quantity);
        const deliverable = deliverables.find(d => d.type === data.deliverable_type);
        
        if (deliverable) {
          const newCompleted = Math.min(deliverable.completed + quantity, deliverable.total);
          
          const { error: updateError } = await supabase
            .from('deliverables')
            .update({ completed: newCompleted })
            .eq('id', deliverable.id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Activity logged successfully!');
      setOpen(false);
      form.reset();
      onActivityAdded();
    } catch (error: any) {
      toast.error(error.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Record completed work and update deliverable progress
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Content Published">Content Published</SelectItem>
                      <SelectItem value="Meeting Completed">Meeting Completed</SelectItem>
                      <SelectItem value="Deliverable Completed">Deliverable Completed</SelectItem>
                      <SelectItem value="Strategy Session">Strategy Session</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what was completed..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliverable_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Deliverable (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deliverable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {deliverables.map((d) => (
                        <SelectItem key={d.id} value={d.type}>
                          {d.type} ({d.completed}/{d.total})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedDeliverableType && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Completed *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                {loading ? 'Logging...' : 'Log Activity'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
