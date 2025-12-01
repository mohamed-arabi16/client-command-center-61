// Email Notification Edge Function
// Purpose: Send transactional emails for proposals, approvals, and notifications
// Usage: POST /send-email with email data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  organizationId?: string;
}

type EmailTemplate =
  | "proposal_sent"
  | "proposal_accepted"
  | "content_approval_request"
  | "content_approved"
  | "content_published"
  | "weekly_summary"
  | "member_invited"
  | "password_reset"
  | "welcome";

interface EmailTemplateConfig {
  subject: (data: Record<string, unknown>) => string;
  html: (data: Record<string, unknown>, branding?: OrganizationBranding) => string;
  text: (data: Record<string, unknown>) => string;
}

interface OrganizationBranding {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  supportEmail?: string;
}

// Email templates
const templates: Record<EmailTemplate, EmailTemplateConfig> = {
  proposal_sent: {
    subject: (data) => `New Proposal from ${data.companyName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#6366f1"}; font-size: 24px; margin-bottom: 20px;">New Proposal</h1>
          <p>Hello ${data.clientName},</p>
          <p>We're excited to share a new proposal with you. Please review the details and let us know if you have any questions.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Proposal:</strong> ${data.proposalTitle}</p>
            <p style="margin: 10px 0 0 0;"><strong>Total Value:</strong> ${data.totalValue}</p>
          </div>
          <a href="${data.proposalUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#6366f1"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Proposal</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
            ${branding?.supportEmail ? `If you have questions, contact us at ${branding.supportEmail}` : ""}
          </p>
        </body>
      </html>
    `,
    text: (data) =>
      `New Proposal from ${data.companyName}\n\nHello ${data.clientName},\n\nWe're excited to share a new proposal with you.\n\nProposal: ${data.proposalTitle}\nTotal Value: ${data.totalValue}\n\nView it here: ${data.proposalUrl}`,
  },

  proposal_accepted: {
    subject: (data) => `Proposal Accepted - ${data.clientName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#10b981"};">🎉 Proposal Accepted!</h1>
          <p>Great news! ${data.clientName} has accepted your proposal.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Client:</strong> ${data.clientName}</p>
            <p><strong>Contract Value:</strong> ${data.totalValue}</p>
            <p><strong>Accepted At:</strong> ${data.acceptedAt}</p>
          </div>
          <a href="${data.clientUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#10b981"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Client</a>
        </body>
      </html>
    `,
    text: (data) =>
      `Proposal Accepted!\n\nGreat news! ${data.clientName} has accepted your proposal.\n\nContract Value: ${data.totalValue}\n\nView client: ${data.clientUrl}`,
  },

  content_approval_request: {
    subject: (data) => `Content Approval Needed - ${data.clientName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#f59e0b"};">Content Ready for Review</h1>
          <p>Hello,</p>
          <p>New content for ${data.clientName} is ready for your approval.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Platforms:</strong> ${data.platforms}</p>
            <p><strong>Scheduled:</strong> ${data.scheduledTime}</p>
          </div>
          ${data.caption ? `<p style="background: #fff; border-left: 3px solid ${branding?.primaryColor || "#6366f1"}; padding: 15px; margin: 20px 0;"><em>${data.caption}</em></p>` : ""}
          <a href="${data.approvalUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#f59e0b"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Content</a>
        </body>
      </html>
    `,
    text: (data) =>
      `Content Approval Needed\n\nNew content for ${data.clientName} is ready for review.\n\nPlatforms: ${data.platforms}\nScheduled: ${data.scheduledTime}\n\nReview: ${data.approvalUrl}`,
  },

  content_approved: {
    subject: (data) => `Content Approved - ${data.clientName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#10b981"};">✅ Content Approved</h1>
          <p>Your content for ${data.clientName} has been approved and will be published as scheduled.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Platforms:</strong> ${data.platforms}</p>
            <p><strong>Publish Date:</strong> ${data.publishDate}</p>
          </div>
        </body>
      </html>
    `,
    text: (data) =>
      `Content Approved\n\nYour content for ${data.clientName} has been approved.\n\nPublish Date: ${data.publishDate}`,
  },

  content_published: {
    subject: (data) => `Content Published - ${data.clientName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#10b981"};">🚀 Content Published</h1>
          <p>Your content for ${data.clientName} has been successfully published.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Platforms:</strong> ${data.platforms}</p>
            <p><strong>Published:</strong> ${data.publishedAt}</p>
          </div>
        </body>
      </html>
    `,
    text: (data) =>
      `Content Published\n\nYour content for ${data.clientName} has been published.\n\nPublished: ${data.publishedAt}`,
  },

  weekly_summary: {
    subject: (data) => `Weekly Summary - ${data.weekOf}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#6366f1"};">Weekly Summary</h1>
          <p>Here's your activity summary for the week of ${data.weekOf}:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>New Clients:</strong> ${data.newClients}</p>
            <p><strong>Proposals Sent:</strong> ${data.proposalsSent}</p>
            <p><strong>Content Published:</strong> ${data.contentPublished}</p>
            <p><strong>Revenue:</strong> ${data.revenue}</p>
          </div>
          <a href="${data.dashboardUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#6366f1"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
        </body>
      </html>
    `,
    text: (data) =>
      `Weekly Summary - ${data.weekOf}\n\nNew Clients: ${data.newClients}\nProposals Sent: ${data.proposalsSent}\nContent Published: ${data.contentPublished}\nRevenue: ${data.revenue}\n\nView dashboard: ${data.dashboardUrl}`,
  },

  member_invited: {
    subject: (data) => `You've been invited to ${data.organizationName}`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#6366f1"};">Team Invitation</h1>
          <p>You've been invited to join ${data.organizationName} by ${data.invitedBy}.</p>
          <a href="${data.inviteUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#6366f1"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Accept Invitation</a>
        </body>
      </html>
    `,
    text: (data) =>
      `Team Invitation\n\nYou've been invited to join ${data.organizationName} by ${data.invitedBy}.\n\nAccept invitation: ${data.inviteUrl}`,
  },

  password_reset: {
    subject: () => "Password Reset Request",
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#6366f1"};">Password Reset</h1>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${data.resetUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#6366f1"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </body>
      </html>
    `,
    text: (data) =>
      `Password Reset\n\nWe received a request to reset your password.\n\nReset your password: ${data.resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  },

  welcome: {
    subject: (data) => `Welcome to ${data.companyName}!`,
    html: (data, branding) => `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-width: 200px; margin-bottom: 20px;">` : ""}
          <h1 style="color: ${branding?.primaryColor || "#6366f1"};">Welcome! 🎉</h1>
          <p>Hi ${data.name},</p>
          <p>Welcome to ${data.companyName}! We're excited to have you on board.</p>
          <p>Get started by exploring your dashboard and setting up your first client.</p>
          <a href="${data.dashboardUrl}" style="display: inline-block; background: ${branding?.primaryColor || "#6366f1"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Go to Dashboard</a>
        </body>
      </html>
    `,
    text: (data) =>
      `Welcome to ${data.companyName}!\n\nHi ${data.name},\n\nWe're excited to have you on board.\n\nGo to dashboard: ${data.dashboardUrl}`,
  },
};

async function getOrganizationBranding(
  supabase: any,
  organizationId?: string
): Promise<OrganizationBranding | undefined> {
  if (!organizationId) return undefined;

  const { data, error } = await supabase
    .from("organizations")
    .select("name, logo_url, primary_color, company_name, support_email")
    .eq("id", organizationId)
    .single();

  if (error || !data) return undefined;

  return {
    companyName: data.company_name || data.name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color || "#6366f1",
    supportEmail: data.support_email,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const emailRequest = (await req.json()) as EmailRequest;
    const { to, subject: customSubject, template, data, organizationId } = emailRequest;

    // Get email template
    const templateConfig = templates[template];
    if (!templateConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get organization branding
    const branding = await getOrganizationBranding(supabase, organizationId);

    // Generate email content
    const subject = customSubject || templateConfig.subject(data);
    const html = templateConfig.html(data, branding);
    const text = templateConfig.text(data);

    // Send email via provider (Resend, SendGrid, etc.)
    // For this example, we'll use Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured, email would be sent:", {
        to,
        subject,
        template,
      });

      // In development, just log
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email logged (no provider configured)",
          preview: { to, subject, template },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send via Resend
    const fromEmail = branding?.supportEmail || Deno.env.get("FROM_EMAIL") || "noreply@example.com";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Email sending failed: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
