import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-approve posts process...');

    // Create Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find posts that are past their auto-approve deadline
    const now = new Date().toISOString();
    
    const { data: postsToApprove, error: fetchError } = await supabase
      .from('content_posts')
      .select('id, client_id, caption, platforms, scheduled_time, auto_approve_at')
      .eq('status', 'pending_approval')
      .not('auto_approve_at', 'is', null)
      .lte('auto_approve_at', now);

    if (fetchError) {
      console.error('Error fetching posts to auto-approve:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${postsToApprove?.length || 0} posts to auto-approve`);

    if (!postsToApprove || postsToApprove.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No posts to auto-approve',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Update all posts to approved status
    const postIds = postsToApprove.map(p => p.id);
    
    const { data: updatedPosts, error: updateError } = await supabase
      .from('content_posts')
      .update({ 
        status: 'approved',
        approved_at: now
      })
      .in('id', postIds)
      .select();

    if (updateError) {
      console.error('Error updating posts:', updateError);
      throw updateError;
    }

    console.log(`Successfully auto-approved ${updatedPosts?.length || 0} posts`);

    // For each approved post, complete related todos and create activity log
    for (const post of updatedPosts || []) {
      console.log(`Auto-approved post ${post.id} for client ${post.client_id}`);

      // Auto-complete related todos
      const { error: todoError } = await supabase
        .from('todos')
        .update({ completed: true, completed_at: now })
        .eq('client_id', post.client_id)
        .eq('title', 'Review Content Post')
        .eq('completed', false)
        .gte('due_date', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 2 days

      if (todoError) {
        console.error(`Error completing todo for post ${post.id}:`, todoError);
      }

      // Create activity log entry for auto-approval
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          client_id: post.client_id,
          type: 'Content Auto-Approved',
          description: `Content for ${post.platforms?.join(', ')} was automatically approved after 24 hours`,
          date: now,
          created_by: post.created_by
        });

      if (activityError) {
        console.error(`Error creating activity for post ${post.id}:`, activityError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Posts auto-approved successfully',
        processed: updatedPosts?.length || 0,
        posts: updatedPosts 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in auto-approve function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to auto-approve posts' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
