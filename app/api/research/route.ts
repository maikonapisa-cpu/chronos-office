import { NextRequest, NextResponse } from "next/server";
import { handleResearcherCommand } from "@/lib/researcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.source || !body.action || !body.query) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "MISSING_FIELDS",
          error_message: "Missing required fields: source, action, query",
        },
        { status: 400 }
      );
    }

    // Call handler
    const response = await handleResearcherCommand({
      source: body.source,
      action: body.action,
      query: body.query,
      time_window: body.time_window,
      priority: body.priority,
      user_id: body.user_id,
      trace_id: body.trace_id,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Research API Error]", error);

    return NextResponse.json(
      {
        ok: false,
        error_code: "INTERNAL_ERROR",
        error_message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
