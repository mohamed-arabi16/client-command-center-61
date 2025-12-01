import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting to prevent abuse
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, {
    maxRequests: 5,
    windowSeconds: 60,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { proposal_id, share_token } = await req.json();

    if (!proposal_id || !share_token) {
      return new Response(
        JSON.stringify({ error: 'Missing proposal_id or share_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .eq('share_token', share_token)
      .single();

    if (proposalError || !proposal) {
      console.error('Proposal fetch error:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Invalid proposal or token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (proposal.status === 'sent' || proposal.status === 'active' || proposal.status === 'accepted') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Proposal already accepted',
          client_id: proposal.client_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let clientId = proposal.client_id;

    // If no client exists, create one
    if (!clientId) {
      const newClient = {
        user_id: proposal.user_id,
        name: proposal.client_name,
        status: 'active',
        contract_type: proposal.contract_duration,
        start_date: proposal.contract_start_date || new Date().toISOString().split('T')[0],
        total_contract_value: proposal.total_value,
        instagram_url: proposal.instagram_url,
        payment_terms: proposal.payment_schedule,
      };

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(newClient)
        .select()
        .single();

      if (clientError) {
        console.error('Client creation error:', clientError);
        return new Response(
          JSON.stringify({ error: 'Failed to create client record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      clientId = client.id;

      // Fetch proposal items to create deliverables
      const { data: items, error: itemsError } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposal_id);

      if (!itemsError && items && items.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const deliverables = items.map(item => ({
          client_id: clientId,
          proposal_id: proposal_id,
          type: item.service_name,
          total: item.quantity,
          completed: 0,
          period: proposal.contract_duration,
          billing_period: currentMonth
        }));

        await supabase.from('deliverables').insert(deliverables);
      }
    }

    // Update proposal status
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        client_id: clientId,
        converted_to_client_id: clientId,
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Proposal update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update proposal status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proposal ${proposal_id} accepted successfully, client: ${clientId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Proposal accepted successfully',
        client_id: clientId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in accept-proposal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
