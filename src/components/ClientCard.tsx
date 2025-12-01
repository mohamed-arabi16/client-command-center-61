import { useState, useEffect } from "react";
import { Client } from "@/types/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Instagram, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClientCardProps {
  client: Client;
}

export const ClientCard = ({ client }: ClientCardProps) => {
  const navigate = useNavigate();
  const [proposalCount, setProposalCount] = useState(0);
  const [latestMetrics, setLatestMetrics] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);

  const statusColors = {
    active: "bg-success text-success-foreground",
    paused: "bg-warning text-warning-foreground",
    completed: "bg-muted text-muted-foreground",
  };

  useEffect(() => {
    fetchProposalCount();
    fetchBusinessMetrics();
  }, [client.id]);

  const fetchProposalCount = async () => {
    const { count } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id);
    setProposalCount(count || 0);
  };

  const fetchBusinessMetrics = async () => {
    // Fetch latest metrics
    const { data: metricsData } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('client_id', client.id)
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest ROI
    const { data: roiDataResult } = await supabase
      .from('roi_estimates')
      .select('*')
      .eq('client_id', client.id)
      .order('month_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    setLatestMetrics(metricsData);
    setRoiData(roiDataResult);
  };

  const getPrimaryMetric = () => {
    if (!latestMetrics) return null;

    switch (client.business_type) {
      case 'car_rental':
        return {
          label: 'GMB Calls',
          value: latestMetrics.gmb_call_clicks,
        };
      case 'beauty_salon':
        return {
          label: 'Bookings',
          value: latestMetrics.booking_form_submissions,
        };
      case 'restaurant':
        return {
          label: 'Directions',
          value: latestMetrics.gmb_direction_clicks,
        };
      default:
        return {
          label: 'Total Leads',
          value: latestMetrics.gmb_call_clicks + latestMetrics.booking_form_submissions + latestMetrics.dm_appointment_requests,
        };
    }
  };

  const primaryMetric = getPrimaryMetric();

  return (
    <Link to={`/client/${client.id}`}>
      <Card className="transition-all hover:shadow-medium hover:scale-[1.02] cursor-pointer bg-gradient-card border-border/50 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden group-hover:bg-primary/20 transition-all">
                {client.logo_url ? (
                  <img 
                    src={client.logo_url} 
                    alt={client.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">{client.name}</h3>
                  {client.instagram_handle && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`https://instagram.com/${client.instagram_handle}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="View Instagram profile"
                    >
                      <Instagram className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{client.contract_type}</p>
              </div>
            </div>
            <Badge className={statusColors[client.status]} variant="secondary">
              {client.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Started: {new Date(client.start_date).toLocaleDateString()}
              </p>
              {roiData && (
                <Badge 
                  variant={roiData.roi_percentage > 100 ? "default" : "secondary"}
                  className="font-semibold"
                >
                  {roiData.roi_percentage.toFixed(0)}% ROI
                </Badge>
              )}
            </div>
            
            {primaryMetric && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{primaryMetric.label}</span>
                <span className="text-lg font-bold text-primary">{primaryMetric.value}</span>
              </div>
            )}

            {proposalCount > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {proposalCount} {proposalCount === 1 ? 'Proposal' : 'Proposals'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/proposals?client=${client.id}`);
                  }}
                  className="text-xs"
                >
                  View
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
