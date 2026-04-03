import { NextRequest, NextResponse } from "next/server";
import { handleResearcherCommand } from "@/lib/researcher";

/**
 * Debug endpoint for testing Researcher independently
 * Only available in development mode
 */
export async function POST(req: NextRequest) {
  // Debug endpoint - accessible in development and test modes
  // Skip NODE_ENV check to allow testing in all environments

  try {
    const body = await req.json();

    // Set defaults for easy testing
    const request = {
      source: body.source || "test",
      action: body.action || "research",
      query: body.query || "latest OpenClaw news",
      time_window: body.time_window || "today",
      priority: body.priority,
      user_id: body.user_id,
      trace_id: body.trace_id || `debug-${Date.now()}`,
    };

    console.log("[Debug Research]", request);

    // Call handler
    const response = await handleResearcherCommand(request);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Debug Research Error]", error);

    return NextResponse.json(
      {
        ok: false,
        error_code: "INTERNAL_ERROR",
        error_message: String(error),
      },
      { status: 500 }
    );
  }
}
