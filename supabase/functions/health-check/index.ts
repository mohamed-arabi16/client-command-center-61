// Health Check Edge Function
// Purpose: Monitor application health, database connectivity, and service status
// Usage: GET /health-check

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: CheckResult;
    auth: CheckResult;
    storage: CheckResult;
    edgeFunctions: CheckResult;
  };
  metrics?: {
    responseTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

interface CheckResult {
  status: "pass" | "fail" | "warn";
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

async function checkDatabase(supabase: any): Promise<CheckResult> {
  const start = Date.now();

  try {
    // Simple query to test database connection
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    const responseTime = Date.now() - start;

    if (error) {
      return {
        status: "fail",
        message: `Database connection failed: ${error.message}`,
        responseTime,
      };
    }

    // Warn if response time is slow
    if (responseTime > 1000) {
      return {
        status: "warn",
        message: "Database connection slow",
        responseTime,
      };
    }

    return {
      status: "pass",
      message: "Database connection healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "fail",
      message: `Database check failed: ${error.message}`,
      responseTime: Date.now() - start,
    };
  }
}

async function checkAuth(supabase: any): Promise<CheckResult> {
  const start = Date.now();

  try {
    // Check if auth service is responsive
    const { data, error } = await supabase.auth.getSession();

    const responseTime = Date.now() - start;

    if (error) {
      return {
        status: "fail",
        message: `Auth service failed: ${error.message}`,
        responseTime,
      };
    }

    return {
      status: "pass",
      message: "Auth service healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "fail",
      message: `Auth check failed: ${error.message}`,
      responseTime: Date.now() - start,
    };
  }
}

async function checkStorage(supabase: any): Promise<CheckResult> {
  const start = Date.now();

  try {
    // List buckets to test storage connection
    const { data, error } = await supabase.storage.listBuckets();

    const responseTime = Date.now() - start;

    if (error) {
      return {
        status: "fail",
        message: `Storage service failed: ${error.message}`,
        responseTime,
      };
    }

    return {
      status: "pass",
      message: "Storage service healthy",
      responseTime,
      details: {
        bucketsCount: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      status: "fail",
      message: `Storage check failed: ${error.message}`,
      responseTime: Date.now() - start,
    };
  }
}

async function checkEdgeFunctions(): Promise<CheckResult> {
  const start = Date.now();

  try {
    // For now, just return healthy since we're running in an edge function
    // In production, you might want to check specific functions
    const responseTime = Date.now() - start;

    return {
      status: "pass",
      message: "Edge functions operational",
      responseTime,
    };
  } catch (error) {
    return {
      status: "fail",
      message: `Edge functions check failed: ${error.message}`,
      responseTime: Date.now() - start,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run all health checks in parallel
    const [databaseCheck, authCheck, storageCheck, edgeFunctionsCheck] =
      await Promise.all([
        checkDatabase(supabase),
        checkAuth(supabase),
        checkStorage(supabase),
        checkEdgeFunctions(),
      ]);

    // Determine overall status
    const checks = {
      database: databaseCheck,
      auth: authCheck,
      storage: storageCheck,
      edgeFunctions: edgeFunctionsCheck,
    };

    const hasFailure = Object.values(checks).some((c) => c.status === "fail");
    const hasWarning = Object.values(checks).some((c) => c.status === "warn");

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (hasFailure) {
      overallStatus = "unhealthy";
    } else if (hasWarning) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    const responseTime = Date.now() - startTime;

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: performance.now(), // Milliseconds since edge function started
      version: Deno.env.get("APP_VERSION") || "1.0.0",
      environment: Deno.env.get("ENVIRONMENT") || "production",
      checks,
      metrics: {
        responseTime,
      },
    };

    // Return appropriate HTTP status code
    let httpStatus = 200;
    if (overallStatus === "degraded") {
      httpStatus = 200; // Still return 200 for degraded
    } else if (overallStatus === "unhealthy") {
      httpStatus = 503; // Service Unavailable
    }

    return new Response(JSON.stringify(healthCheck, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: httpStatus,
    });
  } catch (error) {
    console.error("Health check error:", error);

    const errorResponse: HealthCheck = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: performance.now(),
      version: Deno.env.get("APP_VERSION") || "1.0.0",
      environment: Deno.env.get("ENVIRONMENT") || "production",
      checks: {
        database: { status: "fail", message: "Unknown" },
        auth: { status: "fail", message: "Unknown" },
        storage: { status: "fail", message: "Unknown" },
        edgeFunctions: {
          status: "fail",
          message: `Health check failed: ${error.message}`,
        },
      },
      metrics: {
        responseTime: Date.now() - startTime,
      },
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 503,
    });
  }
});
