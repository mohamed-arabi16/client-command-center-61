import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const deliverableSchema = z.object({
  type: z.string().min(1, 'Type is required').max(100),
  total: z.string().min(1, 'Total is required'),
  period: z.string().min(1, 'Period is required'),
});

type DeliverableFormData = z.infer<typeof deliverableSchema>;

interface AddDeliverableDialogProps {
  clientId: string;
  onDeliverableAdded: () => void;
}

export const AddDeliverableDialog = ({ clientId, onDeliverableAdded }: AddDeliverableDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: {
      type: '',
      total: '',
      period: 'monthly',
    },
  });

  const onSubmit = async (data: DeliverableFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('deliverables').insert({
        client_id: clientId,
        type: data.type,
        total: parseInt(data.total),
        period: data.period,
        completed: 0,
      });

      if (error) throw error;

      toast.success('Deliverable added successfully!');
      setOpen(false);
      form.reset();
      onDeliverableAdded();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add deliverable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Deliverable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Deliverable</DialogTitle>
          <DialogDescription>
            Add a new deliverable type for tracking progress
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deliverable Type *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Videos, Designs, Posts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount *</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="total">Total Contract</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
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
                {loading ? 'Adding...' : 'Add Deliverable'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
