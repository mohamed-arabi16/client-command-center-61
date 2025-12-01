import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEmbeddedTemplate(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>عرض سعر واتفاقية خدمة - Qobouli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --color-brand-primary: #009DB0;
            --color-brand-secondary: #00ABAB;
            --color-brand-light: #B6DCE9;
            --color-brand-bg-light: #E9F4F4;
            --color-brand-dark-text: #0C1439;
        }
        body {
            font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
            background-color: var(--color-brand-bg-light);
            color: var(--color-brand-dark-text);
        }
        .text-brand-primary { color: var(--color-brand-primary); }
        th, td { text-align: right; }
        .text-left { text-align: left; }
        @media print { body { background-color: white; } }
    </style>
</head>
<body class="p-8 md:p-12">
    <div class="printable-content max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-gray-100">
        <header class="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-brand-light">
            <div>
                <h1 class="text-4xl font-bold text-brand-primary">Qobouli</h1>
                <p class="text-lg text-gray-500 mt-1">استراتيجيات المحتوى والإعلام الرقمي</p>
            </div>
            <div class="mt-4 sm:mt-0 sm:text-left">
                <h2 class="text-3xl font-bold text-brand-dark">اتفاقية خدمة</h2>
                <p class="text-gray-500 mt-1">رقم العقد: <span class="font-medium text-gray-700">[CONTRACT_NUMBER]</span></p>
                <p class="text-gray-500">التاريخ: <span class="font-medium text-gray-700">[CONTRACT_DATE]</span></p>
            </div>
        </header>
        <section class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">لصالح (العميل)</h3>
                <div class="mt-3 space-y-2">
                    <p class="text-xl font-bold text-brand-dark">[CLIENT_NAME]</p>
                    <p>[CLIENT_CONTACT_PERSON]</p>
                    <p>[CLIENT_ADDRESS]</p>
                    <p dir="ltr" class="text-right">[CLIENT_PHONE]</p>
                    <p>[CLIENT_EMAIL]</p>
                </div>
            </div>
            <div>
                <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">من قبل (الوكالة)</h3>
                <div class="mt-3 space-y-2">
                    <p class="text-xl font-bold text-brand-dark">Qobouli</p>
                    <p>Basaksehir, Istanbul, Turkey</p>
                    <p dir="ltr" class="text-right">+90 538 013 0948</p>
                    <p>medane999@gmail.com</p>
                    <p>mk.qobouli.com</p>
                </div>
            </div>
        </section>
        <section class="mt-10">
            <p class="text-lg leading-relaxed">
                تم إبرام هذه الاتفاقية بين <strong>[CLIENT_NAME]</strong> ("العميل") وشركة <strong>Qobouli</strong> ("الوكالة") لتقديم خدمات الإعلام الرقمي وإنشاء المحتوى.
            </p>
        </section>
        <section class="mt-10">
            <h2 class="text-2xl font-bold text-brand-primary mb-4">نطاق الخدمات</h2>
            <div class="overflow-x-auto border border-brand-light rounded-lg">
                <table class="min-w-full divide-y divide-brand-light">
                    <thead class="bg-brand-bg-light">
                        <tr>
                            <th class="px-6 py-4 text-right text-xs font-bold text-brand-primary uppercase">البند</th>
                            <th class="px-6 py-4 text-right text-xs font-bold text-brand-primary uppercase">الوصف</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase">السعر</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        [SERVICE_ITEMS]
                    </tbody>
                    <tfoot class="bg-brand-bg-light">
                        <tr>
                            <th colspan="2" class="px-6 py-4 text-left text-sm font-bold text-brand-dark uppercase">المجموع الفرعي ([DURATION_TEXT])</th>
                            <td class="px-6 py-4 text-left whitespace-nowrap"><span class="text-xl font-bold text-brand-primary" dir="ltr">$ [SUBTOTAL_BEFORE_DISCOUNT]</span></td>
                        </tr>
                        [DISCOUNT_ROW]
                        <tr>
                            <th colspan="2" class="px-6 py-4 text-left text-sm font-bold text-brand-dark uppercase">الإجمالي النهائي</th>
                            <td class="px-6 py-4 text-left whitespace-nowrap"><span class="text-xl font-bold text-brand-primary" dir="ltr">$ [TOTAL_AMOUNT]</span></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
        <section class="mt-10">
            <h2 class="text-2xl font-bold text-brand-primary mb-6">شروط الدفع</h2>
            <p class="text-gray-700">يتم سداد قيمة الباقة الإجمالية البالغة <strong dir="ltr">$ [TOTAL_AMOUNT]</strong>:</p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mt-2 pr-4">[PAYMENT_SCHEDULE]</ul>
        </section>
    </div>
</body>
</html>`;
}

function getMonths(duration: string): number {
  const map: { [key: string]: number } = {
    'monthly': 1,
    '3-months': 3,
    '6-months': 6,
    '12-months': 12,
  };
  return map[duration] || 1;
}

function getDurationTextArabic(duration: string): string {
  const map: { [key: string]: string } = {
    'monthly': 'شهر واحد',
    '3-months': '3 أشهر',
    '6-months': '6 أشهر',
    '12-months': '12 شهراً',
  };
  return map[duration] || 'شهر واحد';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposal_id } = await req.json();
    console.log('Generating document for proposal:', proposal_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .eq('user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      throw new Error('Proposal not found');
    }

    // Fetch proposal items
    const { data: items, error: itemsError } = await supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposal_id);

    if (itemsError) {
      throw new Error('Failed to fetch proposal items');
    }

    // Try to load template from storage, fallback to embedded
    let template: string;
    try {
      const { data: templateData, error: templateError } = await supabase.storage
        .from('templates')
        .download('contract_template.html');

      if (templateError) throw templateError;
      
      template = await templateData.text();
      console.log('Loaded template from storage');
    } catch (error) {
      console.log('Storage template not found, using embedded template');
      template = getEmbeddedTemplate();
    }

    // Calculate values
    const months = getMonths(proposal.contract_duration);
    const monthlySubtotal = (items || []).reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    const subtotalBefore = monthlySubtotal * months;
    const discountPercentage = proposal.discount_percentage || 0;
    const discountAmount = discountPercentage > 0 ? (subtotalBefore * (discountPercentage / 100)) : 0;
    const totalAmount = subtotalBefore - discountAmount;

    // Format date
    const formatDate = (dateStr: string) => {
      if (!dateStr) return new Date().toLocaleDateString('ar-EG');
      return new Date(dateStr).toLocaleDateString('ar-EG');
    };

    // Generate service items HTML
    const serviceItemsHtml = (items || []).map((item: any, index: number) => {
      return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap font-medium">${index + 1}. ${item.service_name}</td>
            <td class="px-6 py-4">
                <p class="text-sm text-gray-700">${item.description}</p>
                <p class="text-xs text-gray-500 mt-1">الكمية: ${item.quantity}</p>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-left">
                <span class="font-medium" dir="ltr">$ ${(item.total_price || 0).toFixed(2)}</span>
            </td>
        </tr>
      `;
    }).join('');

    // Generate discount row if applicable
    const discountRowHtml = discountAmount > 0 ? `
        <tr>
            <th scope="row" colspan="2" class="px-6 py-4 text-left text-sm font-bold text-green-600 uppercase tracking-wider">
                خصم ${discountPercentage}%
            </th>
            <td class="px-6 py-4 text-left whitespace-nowrap">
                <span class="text-xl font-bold text-green-600" dir="ltr">
                    -$ ${discountAmount.toFixed(2)}
                </span>
            </td>
        </tr>
    ` : '';

    // Generate payment schedule
    const paymentScheduleHtml = (proposal.payment_schedule || []).map((payment: any, index: number) => {
      return `<li><strong>الدفعة ${index + 1}:</strong> <span dir="ltr">$ ${payment.amount.toFixed(2)}</span> - تاريخ الاستحقاق: ${formatDate(payment.due_date)}</li>`;
    }).join('');

    // Generate notes section
    const notesHtml = proposal.notes ? `
        <p class="text-sm text-brand-dark mt-2">
            <strong>ملاحظات إضافية:</strong><br>
            ${proposal.notes}
        </p>
    ` : '';

    // Replace all placeholders
    let html = template
      .replace(/\[CONTRACT_NUMBER\]/g, proposal.contract_number || 'قيد الإنشاء')
      .replace(/\[CONTRACT_DATE\]/g, formatDate(proposal.created_at))
      .replace(/\[CLIENT_NAME\]/g, proposal.client_name || 'العميل')
      .replace(/\[CLIENT_CONTACT_PERSON\]/g, proposal.client_contact_person || proposal.client_name || 'جهة الاتصال')
      .replace(/\[CLIENT_ADDRESS\]/g, proposal.client_address || 'العنوان غير محدد')
      .replace(/\[CLIENT_PHONE\]/g, proposal.client_phone || 'غير محدد')
      .replace(/\[CLIENT_EMAIL\]/g, proposal.client_email || 'غير محدد')
      .replace(/\[DURATION_TEXT\]/g, getDurationTextArabic(proposal.contract_duration))
      .replace(/\[CONTRACT_START_DATE\]/g, formatDate(proposal.contract_start_date))
      .replace(/\[SERVICE_ITEMS\]/g, serviceItemsHtml)
      .replace(/\[SUBTOTAL_BEFORE_DISCOUNT\]/g, subtotalBefore.toFixed(2))
      .replace(/\[DISCOUNT_ROW\]/g, discountRowHtml)
      .replace(/\[TOTAL_AMOUNT\]/g, totalAmount.toFixed(2))
      .replace(/\[PAYMENT_SCHEDULE\]/g, paymentScheduleHtml)
      .replace(/\[NOTES_SECTION\]/g, notesHtml);

    console.log('Document generated successfully');

    return new Response(
      JSON.stringify({ success: true, html }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error generating document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate document',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
