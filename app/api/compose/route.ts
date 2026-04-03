import { NextRequest, NextResponse } from "next/server";
import { handleCadeCommand } from "@/lib/cade/handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.source || !body.action || !body.query) {
      if (!body.research_packet) {
        return NextResponse.json(
          {
            ok: false,
            error_code: "MISSING_FIELDS",
            error_message:
              "Need either query or research_packet for composition",
          },
          { status: 400 }
        );
      }
    }

    const response = await handleCadeCommand({
      source: body.source || "api",
      action: body.action || "compose",
      query: body.query,
      research_packet: body.research_packet,
      trace_id: body.trace_id,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Cade API Error]", error);
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
