import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MonthlyBISummaryGeneratorProps {
  clientId: string;
  clientName: string;
}

export const MonthlyBISummaryGenerator = ({ clientId, clientName }: MonthlyBISummaryGeneratorProps) => {
  const [generating, setGenerating] = useState(false);

  const generateSummary = async () => {
    setGenerating(true);
    try {
      // Fetch latest business metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from("business_metrics")
        .select("*")
        .eq("client_id", clientId)
        .order("metric_date", { ascending: false })
        .limit(2);

      if (metricsError) throw metricsError;

      // Fetch latest ROI estimate
      const { data: roiData, error: roiError } = await supabase
        .from("roi_estimates")
        .select("*")
        .eq("client_id", clientId)
        .order("month_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roiError) throw roiError;

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;

      if (!metricsData || metricsData.length === 0) {
        toast.error("No metrics data available to generate summary");
        return;
      }

      const currentMetrics = metricsData[0];
      const previousMetrics = metricsData[1];

      // Generate HTML for the BI summary
      const html = generateBISummaryHTML(clientData, currentMetrics, previousMetrics, roiData);

      // Create a blob and download
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName.replace(/\s+/g, "_")}_BI_Summary_${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Business Intelligence Summary generated successfully!");
    } catch (error: any) {
      console.error("Error generating BI summary:", error);
      toast.error(error.message || "Failed to generate BI summary");
    } finally {
      setGenerating(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const generateBISummaryHTML = (client: any, current: any, previous: any, roi: any) => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const metricDate = new Date(current.metric_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    const changes = {
      calls: calculateChange(current.gmb_call_clicks, previous?.gmb_call_clicks || 0),
      directions: calculateChange(current.gmb_direction_clicks, previous?.gmb_direction_clicks || 0),
      website: calculateChange(current.gmb_website_clicks, previous?.gmb_website_clicks || 0),
      bookings: calculateChange(current.booking_form_submissions, previous?.booking_form_submissions || 0),
      dmRequests: calculateChange(current.dm_appointment_requests, previous?.dm_appointment_requests || 0),
      reviews: calculateChange(current.new_reviews_count, previous?.new_reviews_count || 0),
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Intelligence Summary - ${client.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      border-bottom: 3px solid #009DB0;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 32px;
      color: #0C1439;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 4px;
    }
    .header .date {
      font-size: 14px;
      color: #999;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 24px;
      color: #0C1439;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #E9F4F4;
    }
    .roi-box {
      background: linear-gradient(135deg, #009DB0 0%, #00ABAB 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: center;
    }
    .roi-box h3 {
      font-size: 18px;
      margin-bottom: 15px;
      opacity: 0.9;
    }
    .roi-box .roi-value {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .roi-box .roi-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    .roi-box .roi-detail {
      text-align: center;
    }
    .roi-box .roi-detail-label {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 5px;
    }
    .roi-box .roi-detail-value {
      font-size: 20px;
      font-weight: bold;
    }
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .metrics-table th,
    .metrics-table td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #E9F4F4;
    }
    .metrics-table th {
      background: #E9F4F4;
      color: #0C1439;
      font-weight: 600;
      font-size: 14px;
    }
    .metrics-table td {
      font-size: 16px;
    }
    .metrics-table tr:hover {
      background: #E9F4F4;
    }
    .change {
      font-size: 14px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .change.positive {
      color: #00ABAB;
      background: #E9F4F4;
    }
    .change.negative {
      color: #dc2626;
      background: #fee;
    }
    .insight-box {
      background: #E9F4F4;
      border-left: 4px solid #009DB0;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .insight-box h3 {
      color: #0C1439;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .insight-box p {
      color: #666;
      line-height: 1.8;
    }
    .action-items {
      list-style: none;
      padding: 0;
    }
    .action-items li {
      padding: 15px;
      background: white;
      border: 1px solid #E9F4F4;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .action-items li:before {
      content: "→";
      color: #009DB0;
      font-weight: bold;
      margin-right: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #E9F4F4;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Business Intelligence Summary</h1>
      <div class="subtitle">${client.name}</div>
      <div class="date">Report Period: ${metricDate} | Generated: ${currentDate}</div>
    </div>

    ${roi ? `
    <div class="roi-box">
      <h3>Return on Investment</h3>
      <div class="roi-value">${roi.roi_percentage.toFixed(1)}%</div>
      <div class="roi-details">
        <div class="roi-detail">
          <div class="roi-detail-label">Total Leads</div>
          <div class="roi-detail-value">${roi.total_leads}</div>
        </div>
        <div class="roi-detail">
          <div class="roi-detail-label">Est. Conversions</div>
          <div class="roi-detail-value">${roi.estimated_conversions}</div>
        </div>
        <div class="roi-detail">
          <div class="roi-detail-label">Est. Revenue</div>
          <div class="roi-detail-value">$${roi.estimated_revenue.toLocaleString()}</div>
        </div>
        <div class="roi-detail">
          <div class="roi-detail-label">Investment</div>
          <div class="roi-detail-value">$${roi.package_investment.toLocaleString()}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>Performance Dashboard</h2>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Current Period</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>GMB Call Clicks</strong></td>
            <td>${current.gmb_call_clicks}</td>
            <td><span class="change ${changes.calls >= 0 ? 'positive' : 'negative'}">${changes.calls > 0 ? '+' : ''}${changes.calls.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>GMB Direction Clicks</strong></td>
            <td>${current.gmb_direction_clicks}</td>
            <td><span class="change ${changes.directions >= 0 ? 'positive' : 'negative'}">${changes.directions > 0 ? '+' : ''}${changes.directions.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>GMB Website Clicks</strong></td>
            <td>${current.gmb_website_clicks}</td>
            <td><span class="change ${changes.website >= 0 ? 'positive' : 'negative'}">${changes.website > 0 ? '+' : ''}${changes.website.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>Booking Form Submissions</strong></td>
            <td>${current.booking_form_submissions}</td>
            <td><span class="change ${changes.bookings >= 0 ? 'positive' : 'negative'}">${changes.bookings > 0 ? '+' : ''}${changes.bookings.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>DM Appointment Requests</strong></td>
            <td>${current.dm_appointment_requests}</td>
            <td><span class="change ${changes.dmRequests >= 0 ? 'positive' : 'negative'}">${changes.dmRequests > 0 ? '+' : ''}${changes.dmRequests.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>New Reviews</strong></td>
            <td>${current.new_reviews_count}</td>
            <td><span class="change ${changes.reviews >= 0 ? 'positive' : 'negative'}">${changes.reviews > 0 ? '+' : ''}${changes.reviews.toFixed(1)}%</span></td>
          </tr>
          <tr>
            <td><strong>Average Star Rating</strong></td>
            <td>${current.average_star_rating.toFixed(1)} ⭐</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Analysis & Insights</h2>
      <div class="insight-box">
        <h3>Key Takeaways</h3>
        <p>
          This month, we tracked ${current.gmb_call_clicks + current.booking_form_submissions + current.dm_appointment_requests} total conversion actions. 
          ${roi ? `Based on your estimated close rate of ${client.estimated_close_rate || 20}%, this translates to approximately ${roi.estimated_conversions} new customers and $${roi.estimated_revenue.toLocaleString()} in estimated revenue.` : ''}
        </p>
      </div>
      <div class="insight-box">
        <h3>Trust & Reputation</h3>
        <p>
          Your business received ${current.new_reviews_count} new reviews this month, maintaining a ${current.average_star_rating.toFixed(1)}-star average rating. 
          Positive reviews continue to be one of the strongest drivers of new customer trust and conversion.
        </p>
      </div>
      <div class="insight-box">
        <h3>Engagement Trends</h3>
        <p>
          Your content generated ${current.post_saves} saves and ${current.post_shares} shares, indicating strong audience engagement. 
          Your follower count stands at ${current.follower_count.toLocaleString()}, with ${current.video_views.toLocaleString()} total video views this period.
        </p>
      </div>
    </div>

    <div class="section">
      <h2>Next Steps & Action Plan</h2>
      <ul class="action-items">
        <li>Continue content strategy focusing on conversion-driven calls-to-action</li>
        <li>Encourage satisfied customers to leave reviews to maintain strong reputation</li>
        <li>Monitor GMB insights weekly to optimize listing for maximum visibility</li>
        <li>Test new content formats based on highest-performing posts this month</li>
        <li>Review and respond to all customer inquiries within 24 hours</li>
      </ul>
    </div>

    <div class="footer">
      <p>This report was generated automatically based on your business metrics.</p>
      <p>For questions or to discuss these results, please contact your account manager.</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Monthly BI Summary Generator
        </CardTitle>
        <CardDescription>
          Generate a professional Business Intelligence summary report with KPIs, ROI analysis, and actionable insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={generateSummary}
          disabled={generating}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate & Download BI Summary
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Report will be downloaded as an HTML file that can be shared with clients or printed as PDF
        </p>
      </CardContent>
    </Card>
  );
};
