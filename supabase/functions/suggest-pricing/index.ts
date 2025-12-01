import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_description } = await req.json();
    
    if (!client_description) {
      throw new Error("Client description is required");
    }

    // Get Lovable AI key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get pricing catalog
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: catalog, error: catalogError } = await supabase
      .from('pricing_catalog')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (catalogError) throw catalogError;

    // Build AI prompt with pricing catalog
    const systemPrompt = `أنت خبير تسعير لوكالة قبولي للتسويق الرقمي. مهمتك هي تحليل احتياجات العميل واقتراح الخدمات المناسبة من الكتالوج.

كتالوج الأسعار المتاح:
${JSON.stringify(catalog, null, 2)}

قم بتحليل احتياجات العميل واقترح:
1. الخدمات المناسبة من الكتالوج
2. الكميات المقترحة
3. تفسير منطقي لاختياراتك

يجب أن يكون الرد بصيغة JSON فقط:
{
  "suggested_items": [
    {
      "service_name": "اسم الخدمة بالعربي",
      "service_name_en": "Service name in English",
      "description": "وصف الخدمة",
      "quantity": رقم,
      "unit_price": رقم,
      "total_price": رقم,
      "category": "فئة الخدمة"
    }
  ],
  "total": الإجمالي,
  "reasoning": "تفسير الاختيارات بالعربي"
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: client_description }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // Parse AI response (extract JSON from markdown if needed)
    let parsedResponse;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiMessage.match(/```json\n([\s\S]*?)\n```/) || 
                       aiMessage.match(/```\n([\s\S]*?)\n```/) ||
                       [null, aiMessage];
      parsedResponse = JSON.parse(jsonMatch[1] || aiMessage);
    } catch (e) {
      console.error('Failed to parse AI response:', aiMessage);
      throw new Error('Failed to parse AI suggestion');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Suggest pricing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate pricing suggestion';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
