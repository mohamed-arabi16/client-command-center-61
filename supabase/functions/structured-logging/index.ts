// Structured Logging Edge Function
// Purpose: Centralized logging with correlation IDs, log levels, and structured data
// Usage: POST /structured-logging with log data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LogEntry {
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  timestamp?: string;
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    service?: string;
    function?: string;
    environment?: string;
    version?: string;
  };
}

interface LogRequest {
  logs: LogEntry | LogEntry[];
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

    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    let currentUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      currentUserId = user?.id || null;
    }

    // Parse request body
    const body = (await req.json()) as LogRequest;
    const logs = Array.isArray(body.logs) ? body.logs : [body.logs];

    // Process and store logs
    const processedLogs = logs.map((log) => {
      const timestamp = log.timestamp || new Date().toISOString();
      const correlationId = log.correlationId || crypto.randomUUID();

      return {
        level: log.level,
        message: log.message,
        timestamp,
        correlation_id: correlationId,
        user_id: log.userId || currentUserId,
        organization_id: log.organizationId,
        metadata: log.metadata || {},
        error: log.error,
        context: {
          ...log.context,
          environment: Deno.env.get("ENVIRONMENT") || "production",
        },
        created_at: timestamp,
      };
    });

    // Store logs in database (if logs table exists)
    // For now, we'll just log to console and return
    // In production, you'd insert into a logs table or send to external service

    // Console output with formatting
    processedLogs.forEach((log) => {
      const logLine = JSON.stringify({
        ...log,
        timestamp: new Date().toISOString(),
      });

      switch (log.level) {
        case "debug":
          console.debug(logLine);
          break;
        case "info":
          console.info(logLine);
          break;
        case "warn":
          console.warn(logLine);
          break;
        case "error":
        case "fatal":
          console.error(logLine);
          break;
      }
    });

    // TODO: Send to external logging service (DataDog, LogDNA, etc.)
    // Example:
    // await fetch("https://logs.example.com/api/logs", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(processedLogs),
    // });

    return new Response(
      JSON.stringify({
        success: true,
        logsProcessed: processedLogs.length,
        correlationIds: processedLogs.map((l) => l.correlation_id),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing logs:", error);
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
