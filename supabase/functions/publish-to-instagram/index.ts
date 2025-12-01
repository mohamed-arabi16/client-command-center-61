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
    const { post_id, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!post_id) {
      throw new Error("Post ID is required");
    }

    // Fetch the content post
    const { data: post, error: postError } = await supabase
      .from("content_posts")
      .select("*, clients(*)")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    const client = post.clients;
    
    // Check if client has Instagram credentials
    if (!client.instagram_access_token || !client.instagram_business_account_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Instagram not connected",
          setup_required: true,
          message: "Please connect your Instagram Business Account to enable publishing. Go to Client Settings → Connect Instagram Business."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = client.instagram_access_token;
    const instagramAccountId = client.instagram_business_account_id;

    switch (action) {
      case "publish_image": {
        // Step 1: Create media container
        const mediaUrls = post.media_urls || [];
        if (mediaUrls.length === 0) {
          throw new Error("No media URLs provided for the post");
        }

        const imageUrl = mediaUrls[0]; // For single image posts
        const caption = post.caption || "";

        // Create container
        const containerResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: imageUrl,
              caption: caption,
              access_token: accessToken,
            }),
          }
        );

        if (!containerResponse.ok) {
          const errorData = await containerResponse.json();
          throw new Error(errorData.error?.message || "Failed to create media container");
        }

        const containerData = await containerResponse.json();
        const containerId = containerData.id;

        // Step 2: Publish the container
        const publishResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: accessToken,
            }),
          }
        );

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json();
          throw new Error(errorData.error?.message || "Failed to publish post");
        }

        const publishData = await publishResponse.json();

        // Update post status
        await supabase
          .from("content_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
          })
          .eq("id", post_id);

        // Log activity
        await supabase.from("activities").insert({
          client_id: client.id,
          type: "Content Published",
          description: `Instagram post published: "${caption.substring(0, 50)}..."`,
          created_by: post.created_by,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Post published successfully!",
            instagram_media_id: publishData.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "publish_carousel": {
        // For carousel posts (multiple images)
        const mediaUrls = post.media_urls || [];
        if (mediaUrls.length < 2) {
          throw new Error("Carousel posts require at least 2 images");
        }

        // Step 1: Create containers for each image
        const childContainers: string[] = [];
        
        for (const imageUrl of mediaUrls.slice(0, 10)) { // Max 10 images
          const containerResponse = await fetch(
            `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image_url: imageUrl,
                is_carousel_item: true,
                access_token: accessToken,
              }),
            }
          );

          if (!containerResponse.ok) {
            const errorData = await containerResponse.json();
            throw new Error(errorData.error?.message || "Failed to create carousel item");
          }

          const containerData = await containerResponse.json();
          childContainers.push(containerData.id);
        }

        // Step 2: Create carousel container
        const carouselResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_type: "CAROUSEL",
              children: childContainers.join(","),
              caption: post.caption || "",
              access_token: accessToken,
            }),
          }
        );

        if (!carouselResponse.ok) {
          const errorData = await carouselResponse.json();
          throw new Error(errorData.error?.message || "Failed to create carousel");
        }

        const carouselData = await carouselResponse.json();

        // Step 3: Publish carousel
        const publishResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: carouselData.id,
              access_token: accessToken,
            }),
          }
        );

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json();
          throw new Error(errorData.error?.message || "Failed to publish carousel");
        }

        const publishData = await publishResponse.json();

        // Update post status
        await supabase
          .from("content_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
          })
          .eq("id", post_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Carousel published successfully!",
            instagram_media_id: publishData.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_status": {
        // Check container status (useful for async processing)
        const { container_id } = await req.json();
        
        const statusResponse = await fetch(
          `https://graph.facebook.com/v19.0/${container_id}?fields=status_code,status&access_token=${accessToken}`
        );

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json();
          throw new Error(errorData.error?.message || "Failed to check status");
        }

        const statusData = await statusResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, status: statusData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action. Use: publish_image, publish_carousel, check_status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Instagram publish error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
