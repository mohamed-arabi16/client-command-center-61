import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Phone, Navigation, MousePointer, Calendar, Star, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BusinessMetrics {
  id: string;
  metric_date: string;
  gmb_call_clicks: number;
  gmb_direction_clicks: number;
  gmb_website_clicks: number;
  booking_form_submissions: number;
  dm_appointment_requests: number;
  link_in_bio_clicks: number;
  new_reviews_count: number;
  average_star_rating: number;
  post_saves: number;
  post_shares: number;
  follower_count: number;
  video_views: number;
}

interface ROIEstimate {
  id: string;
  month_date: string;
  total_leads: number;
  estimated_conversions: number;
  estimated_revenue: number;
  package_investment: number;
  roi_percentage: number;
}

interface BusinessIntelligenceDashboardProps {
  clientId: string;
}

export const BusinessIntelligenceDashboard = ({ clientId }: BusinessIntelligenceDashboardProps) => {
  const [metrics, setMetrics] = useState<BusinessMetrics[]>([]);
  const [roiData, setRoiData] = useState<ROIEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [clientId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Fetch last 2 months of metrics for comparison
      const { data: metricsData, error: metricsError } = await supabase
        .from("business_metrics")
        .select("*")
        .eq("client_id", clientId)
        .order("metric_date", { ascending: false })
        .limit(2);

      if (metricsError) throw metricsError;

      // Fetch latest ROI estimate
      const { data: roiDataResult, error: roiError } = await supabase
        .from("roi_estimates")
        .select("*")
        .eq("client_id", clientId)
        .order("month_date", { ascending: false })
        .limit(1)
        .single();

      if (roiError && roiError.code !== "PGRST116") throw roiError;

      setMetrics(metricsData || []);
      setRoiData(roiDataResult);
    } catch (error) {
      console.error("Error fetching business intelligence data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentMetrics = metrics[0];
  const previousMetrics = metrics[1];

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const MetricCard = ({
    title,
    value,
    previousValue,
    icon: Icon,
    format = "number",
  }: {
    title: string;
    value: number;
    previousValue?: number;
    icon: any;
    format?: "number" | "currency" | "percentage";
  }) => {
    const change = previousValue !== undefined ? calculateChange(value, previousValue) : 0;
    const isPositive = change > 0;
    const hasChange = previousValue !== undefined && change !== 0;

    const formatValue = () => {
      if (format === "currency") return `$${value.toLocaleString()}`;
      if (format === "percentage") return `${value.toFixed(1)}%`;
      return value.toLocaleString();
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue()}</div>
          {hasChange && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={isPositive ? "text-green-500" : "text-red-500"}>
                {Math.abs(change).toFixed(1)}% from last month
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Business Intelligence Dashboard</CardTitle>
            <CardDescription>Loading metrics...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentMetrics) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Business Intelligence Dashboard</CardTitle>
            <CardDescription>
              No metrics data available yet. Start tracking business metrics to see insights here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ROI Summary */}
      {roiData && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ROI Overview</span>
              <Badge variant={roiData.roi_percentage > 100 ? "default" : "secondary"}>
                {roiData.roi_percentage.toFixed(1)}% ROI
              </Badge>
            </CardTitle>
            <CardDescription>Return on Investment for this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{roiData.total_leads}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Conversions</p>
                <p className="text-2xl font-bold">{roiData.estimated_conversions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Revenue</p>
                <p className="text-2xl font-bold">${roiData.estimated_revenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investment</p>
                <p className="text-2xl font-bold">${roiData.package_investment.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Conversion Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="GMB Call Clicks"
            value={currentMetrics.gmb_call_clicks}
            previousValue={previousMetrics?.gmb_call_clicks}
            icon={Phone}
          />
          <MetricCard
            title="GMB Directions"
            value={currentMetrics.gmb_direction_clicks}
            previousValue={previousMetrics?.gmb_direction_clicks}
            icon={Navigation}
          />
          <MetricCard
            title="GMB Website Clicks"
            value={currentMetrics.gmb_website_clicks}
            previousValue={previousMetrics?.gmb_website_clicks}
            icon={MousePointer}
          />
          <MetricCard
            title="Booking Submissions"
            value={currentMetrics.booking_form_submissions}
            previousValue={previousMetrics?.booking_form_submissions}
            icon={Calendar}
          />
          <MetricCard
            title="DM Appointment Requests"
            value={currentMetrics.dm_appointment_requests}
            previousValue={previousMetrics?.dm_appointment_requests}
            icon={MessageSquare}
          />
          <MetricCard
            title="Link in Bio Clicks"
            value={currentMetrics.link_in_bio_clicks}
            previousValue={previousMetrics?.link_in_bio_clicks}
            icon={MousePointer}
          />
        </div>
      </div>

      {/* Trust Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Trust & Reputation</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="New Reviews"
            value={currentMetrics.new_reviews_count}
            previousValue={previousMetrics?.new_reviews_count}
            icon={Star}
          />
          <MetricCard
            title="Average Rating"
            value={currentMetrics.average_star_rating}
            previousValue={previousMetrics?.average_star_rating}
            icon={Star}
            format="number"
          />
        </div>
      </div>

      {/* Context Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Engagement Context</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Post Saves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.post_saves}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Post Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.post_shares}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.follower_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Video Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.video_views.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
