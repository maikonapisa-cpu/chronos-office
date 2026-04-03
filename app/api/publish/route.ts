import { NextRequest, NextResponse } from "next/server";
import { handleMaikoCommand } from "@/lib/maiko/handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation: require source + action
    if (!body.source || !body.action) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "MISSING_FIELDS",
          error_message: "Need source and action",
        },
        { status: 400 }
      );
    }

    // Validation: require either query OR posting_packet
    if (!body.query && !body.posting_packet) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "MISSING_FIELDS",
          error_message: "Need either query or posting_packet",
        },
        { status: 400 }
      );
    }

    // Delegate to handler
    const response = await handleMaikoCommand({
      source: body.source || "api",
      action: body.action || "publish",
      query: body.query,
      posting_packet: body.posting_packet,
      target_platforms: body.target_platforms || ["bluesky"],
      approval_required: body.approval_required !== false,
      auto_publish: body.auto_publish || false,
      auto_reply: body.auto_reply || false,
      schedule_time: body.schedule_time,
      trace_id: body.trace_id,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Maiko API Error]", error);
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
