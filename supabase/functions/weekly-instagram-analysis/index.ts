import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!client_id) {
      throw new Error("Client ID is required");
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      throw new Error("Client not found");
    }

    // Fetch recent business metrics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: metrics, error: metricsError } = await supabase
      .from("business_metrics")
      .select("*")
      .eq("client_id", client_id)
      .gte("metric_date", oneWeekAgo.toISOString().split("T")[0])
      .order("metric_date", { ascending: true });

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
    }

    // Fetch recent activities
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", oneWeekAgo.toISOString())
      .order("date", { ascending: false });

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
    }

    // Fetch recent deliverables
    const { data: deliverables, error: deliverablesError } = await supabase
      .from("deliverables")
      .select("*")
      .eq("client_id", client_id);

    if (deliverablesError) {
      console.error("Error fetching deliverables:", deliverablesError);
    }

    // Calculate summary stats
    const totalDeliverables = deliverables?.reduce((sum, d) => sum + d.total, 0) || 0;
    const completedDeliverables = deliverables?.reduce((sum, d) => sum + d.completed, 0) || 0;
    const deliverableProgress = totalDeliverables > 0 
      ? Math.round((completedDeliverables / totalDeliverables) * 100) 
      : 0;

    const latestMetric = metrics?.[metrics.length - 1];
    const oldestMetric = metrics?.[0];
    
    const followerGrowth = latestMetric?.follower_count && oldestMetric?.follower_count
      ? latestMetric.follower_count - oldestMetric.follower_count
      : 0;

    // Prepare context for AI analysis
    const analysisContext = {
      client_name: client.name,
      business_type: client.business_type || "General Business",
      primary_goal: client.primary_goal || "Brand Awareness",
      instagram_handle: client.instagram_handle,
      instagram_followers: client.instagram_follower_count,
      follower_growth_this_week: followerGrowth,
      activities_this_week: activities?.length || 0,
      deliverable_progress: deliverableProgress,
      total_deliverables: totalDeliverables,
      completed_deliverables: completedDeliverables,
      metrics_summary: {
        dm_requests: metrics?.reduce((sum, m) => sum + (m.dm_appointment_requests || 0), 0) || 0,
        link_clicks: metrics?.reduce((sum, m) => sum + (m.link_in_bio_clicks || 0), 0) || 0,
        post_saves: metrics?.reduce((sum, m) => sum + (m.post_saves || 0), 0) || 0,
        post_shares: metrics?.reduce((sum, m) => sum + (m.post_shares || 0), 0) || 0,
      }
    };

    // Generate AI analysis using Lovable AI
    let aiAnalysis = null;
    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a social media marketing analyst. Generate a concise weekly performance report for a client. 
                Be professional, data-driven, and provide actionable insights. 
                Focus on:
                1. Key performance highlights
                2. Areas of improvement
                3. Recommendations for next week
                Keep the report under 300 words.`
              },
              {
                role: "user",
                content: `Generate a weekly Instagram performance analysis for ${client.name}:
                
                Business Type: ${analysisContext.business_type}
                Primary Goal: ${analysisContext.primary_goal}
                Instagram Handle: @${analysisContext.instagram_handle || 'N/A'}
                Current Followers: ${analysisContext.instagram_followers?.toLocaleString() || 'N/A'}
                Follower Growth This Week: ${followerGrowth >= 0 ? '+' : ''}${followerGrowth}
                
                Activities Logged: ${analysisContext.activities_this_week}
                Deliverable Progress: ${analysisContext.deliverable_progress}% (${completedDeliverables}/${totalDeliverables})
                
                Engagement Metrics This Week:
                - DM Appointment Requests: ${analysisContext.metrics_summary.dm_requests}
                - Link in Bio Clicks: ${analysisContext.metrics_summary.link_clicks}
                - Post Saves: ${analysisContext.metrics_summary.post_saves}
                - Post Shares: ${analysisContext.metrics_summary.post_shares}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiAnalysis = aiData.choices?.[0]?.message?.content;
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }
    }

    // Create the report
    const report = {
      client_id,
      client_name: client.name,
      period_start: oneWeekAgo.toISOString().split("T")[0],
      period_end: new Date().toISOString().split("T")[0],
      summary: analysisContext,
      ai_analysis: aiAnalysis,
      generated_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Weekly analysis error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
