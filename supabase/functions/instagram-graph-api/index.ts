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
    const { action, client_id, access_token, instagram_business_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Facebook App credentials
    const FACEBOOK_APP_ID = Deno.env.get("FACEBOOK_APP_ID");
    const FACEBOOK_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET");

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Facebook App credentials not configured",
          setup_required: true,
          instructions: `To enable Instagram Graph API integration:
1. Create a Facebook App at https://developers.facebook.com/
2. Add the Instagram Graph API product
3. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to your secrets
4. Set up Facebook Login to get user access tokens`
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "get_profile": {
        // Get Instagram Business Account profile using Graph API
        if (!access_token || !instagram_business_id) {
          throw new Error("Access token and Instagram Business ID are required");
        }

        const profileResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagram_business_id}?fields=id,username,profile_picture_url,followers_count,follows_count,media_count,biography&access_token=${access_token}`
        );

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.error?.message || "Failed to fetch Instagram profile");
        }

        const profileData = await profileResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, data: profileData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_insights": {
        // Get Instagram Business Account insights
        if (!access_token || !instagram_business_id) {
          throw new Error("Access token and Instagram Business ID are required");
        }

        // Get account insights (impressions, reach, profile_views)
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagram_business_id}/insights?metric=impressions,reach,profile_views,follower_count&period=day&access_token=${access_token}`
        );

        if (!insightsResponse.ok) {
          const errorData = await insightsResponse.json();
          throw new Error(errorData.error?.message || "Failed to fetch insights");
        }

        const insightsData = await insightsResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, data: insightsData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_media": {
        // Get recent media posts
        if (!access_token || !instagram_business_id) {
          throw new Error("Access token and Instagram Business ID are required");
        }

        const mediaResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagram_business_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=25&access_token=${access_token}`
        );

        if (!mediaResponse.ok) {
          const errorData = await mediaResponse.json();
          throw new Error(errorData.error?.message || "Failed to fetch media");
        }

        const mediaData = await mediaResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, data: mediaData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "exchange_token": {
        // Exchange short-lived token for long-lived token
        const { short_lived_token } = await req.json();
        
        if (!short_lived_token) {
          throw new Error("Short-lived token is required");
        }

        const tokenResponse = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${short_lived_token}`
        );

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error?.message || "Failed to exchange token");
        }

        const tokenData = await tokenResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, data: tokenData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "store_credentials": {
        // Store Instagram credentials for a client
        if (!client_id || !access_token || !instagram_business_id) {
          throw new Error("Client ID, access token, and Instagram Business ID are required");
        }

        const { error } = await supabase
          .from("clients")
          .update({
            instagram_access_token: access_token,
            instagram_business_account_id: instagram_business_id,
            instagram_scraped_at: new Date().toISOString(),
          })
          .eq("id", client_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Credentials stored successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Instagram Graph API error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
