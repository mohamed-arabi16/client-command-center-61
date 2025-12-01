import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, createRateLimitResponse, getRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { instagram_handle } = await req.json();
    
    console.log("Scraping Instagram profile for:", instagram_handle);
    
    if (!instagram_handle) {
      throw new Error("Instagram handle is required");
    }

    // Check if RAPIDAPI_KEY is configured (optional)
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    
    if (!RAPIDAPI_KEY) {
      console.log("No RAPIDAPI_KEY found, returning error");
      // Return error to inform user they need to configure API key
      return new Response(
        JSON.stringify({
          success: false,
          error: "Instagram auto-fetch is not configured. Please set up RAPIDAPI_KEY in Supabase Edge Function secrets.",
          instructions: "1. Sign up at https://rapidapi.com\n2. Subscribe to 'Instagram Scraper API'\n3. Add RAPIDAPI_KEY to Supabase Edge Function secrets",
          fallback: "You can manually enter Instagram data in the form below."
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Using RapidAPI to fetch Instagram data");
    
    try {
      // Use RapidAPI Instagram scraper
      const response = await fetch(
        `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${instagram_handle}`,
        {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com"
          }
        }
      );

      if (!response.ok) {
        console.error("RapidAPI error:", response.status, "- falling back to basic data");
        // Fall back to basic data instead of throwing error
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              username: instagram_handle,
              profile_pic_url: `https://ui-avatars.com/api/?name=${instagram_handle}&size=200&background=random`,
              full_name: null,
              bio: null,
              follower_count: null,
              method: "basic",
              api_error: `API returned status ${response.status}. Please verify your RapidAPI key is valid and subscribed to the Instagram Scraper API.`
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiData = await response.json();
      console.log("Instagram data fetched successfully");
      
      // Parse the response (structure varies by API provider)
      const profileData = {
        username: apiData.data?.username || instagram_handle,
        profile_pic_url: apiData.data?.profile_pic_url_hd || apiData.data?.profile_pic_url,
        full_name: apiData.data?.full_name,
        bio: apiData.data?.biography,
        follower_count: apiData.data?.follower_count,
        method: "api"
      };

      // Add rate limit headers to response
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      const responseHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      for (const [key, value] of rateLimitHeaders.entries()) {
        responseHeaders[key] = value;
      }

      return new Response(
        JSON.stringify({ success: true, data: profileData }),
        { headers: responseHeaders }
      );
    } catch (apiError) {
      console.error("RapidAPI request failed:", apiError);
      // Fall back to basic data on any error
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            username: instagram_handle,
            profile_pic_url: `https://ui-avatars.com/api/?name=${instagram_handle}&size=200&background=random`,
            full_name: null,
            bio: null,
            follower_count: null,
            method: "basic"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Instagram scrape error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape Instagram profile";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
