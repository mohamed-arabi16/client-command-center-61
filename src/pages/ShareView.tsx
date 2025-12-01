import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Building2, CheckCircle2 } from 'lucide-react';

const ShareView = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetchShareData();
    }
  }, [token]);

  const fetchShareData = async () => {
    try {
      // Verify token and get client
      const { data: linkData } = await supabase
        .from('shareable_links')
        .select('client_id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (!linkData) {
        setLoading(false);
        return;
      }

      // Update last accessed
      await supabase
        .from('shareable_links')
        .update({ last_accessed: new Date().toISOString() })
        .eq('token', token);

      // Fetch client data (without auth)
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', linkData.client_id)
        .single();

      setClient(clientData);

      // Fetch deliverables
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('*')
        .eq('client_id', linkData.client_id)
        .order('created_at', { ascending: true });

      setDeliverables(deliverablesData || []);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', linkData.client_id)
        .order('date', { ascending: false })
        .limit(20);

      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error fetching share data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Not Found</h1>
          <p className="text-muted-foreground">
            This shareable link is invalid or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
              <p className="text-muted-foreground">{client.contract_type}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contract Progress */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Contract Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliverables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No deliverables yet
                </p>
              ) : (
                deliverables.map((deliverable) => {
                  const percentage = (deliverable.completed / deliverable.total) * 100;
                  const isComplete = deliverable.completed === deliverable.total;

                  return (
                    <div key={deliverable.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-card-foreground">
                          {deliverable.type}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {deliverable.completed}/{deliverable.total}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      {isComplete && (
                        <p className="text-xs text-success">✓ Completed</p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.deliverable_type && (
                          <span className="text-xs text-primary font-medium">
                            {activity.deliverable_type}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShareView;
