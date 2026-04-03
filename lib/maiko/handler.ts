/**
 * Maiko Handler - Final Publishing Agent
 * Receives Cade's PostingPacket, applies editorial judgment, outputs PublishingPacket
 */

import { parsePublishIntent, type ParsedPublishIntent } from "./parser";
import { selectAndEditDrafts } from "./publisher";
import { formatPublishingPacket, generatePublishBrief } from "./formatter";
import { postToBluesky } from "./bluesky";

// ============================================================================
// Request/Response Interfaces
// ============================================================================

export interface MaikoRequest {
  source: string;
  action: string;
  query?: string;
  posting_packet?: PostingPacket;
  target_platforms?: string[];
  approval_required?: boolean;
  auto_publish?: boolean;
  auto_reply?: boolean;
  schedule_time?: string;
  trace_id?: string;
}

export interface MaikoResponse {
  ok: boolean;
  action: string;
  trace_id?: string;
  brief: string;
  publish_packet?: PublishingPacket;
  error_code?: string;
  error_message?: string;
}

// ============================================================================
// Publishing Packet Interfaces
// ============================================================================

export interface PostingPacket {
  batch_date: string;
  timezone: string;
  platform_mix: string[];
  total_drafts: number;
  tier_a_ready: DraftCandidate[];
  tier_b_review: DraftCandidate[];
  tier_c_hold: DraftCandidate[];
  source_trace_table?: Map<string, any>;
  batch_health?: any;
  posting_summary?: string;
}

export interface DraftCandidate {
  post_id: string;
  source_item_id: string;
  platform: string;
  format: string;
  angle_type: string;
  hook: string;
  text: string;
  rationale: string;
  confidence: string;
  freshness: string;
  publish_priority: number;
  source_list: string[];
  risk_notes: string[];
}

export interface PublishingPacket {
  run_date: string;
  timezone: string;
  status: "draft" | "approved" | "scheduled" | "published";
  publish_now: SelectedPost[];
  scheduled: ScheduledPost[];
  queue: QueuedPost[];
  held: HeldPost[];
  rejected: RejectedPost[];
  source_trace: Map<string, StoryTrace>;
  account_health_score: number;
  account_health_notes: string;
  mode: {
    approval_required: boolean;
    auto_publish: boolean;
    auto_reply: boolean;
  };
}

export interface SelectedPost {
  draft_id: string;
  post_text: string;
  platform: string;
  angle_type: string;
  hook: string;
  source_item_id: string;
  source_list: string[];
  confidence: string;
  freshness: string;
  publish_score: number;
  publish_decision: string;
  decision_reason: string;
}

export interface ScheduledPost extends SelectedPost {
  scheduled_time: string;
}

export interface QueuedPost extends SelectedPost {
  queue_priority: number;
}

export interface HeldPost extends SelectedPost {
  hold_reason: string;
}

export interface RejectedPost extends SelectedPost {
  rejection_reason: string;
}

export interface StoryTrace {
  headline: string;
  confidence: string;
  freshness: string;
  sources: string[];
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(request: MaikoRequest): {
  valid: boolean;
  error?: string;
  code?: string;
} {
  const validSources = ["telegram", "test", "chris", "debug"];

  if (!request.source || !validSources.includes(request.source)) {
    return {
      valid: false,
      code: "INVALID_REQUEST",
      error: "Invalid source",
    };
  }

  if (!request.action || request.action !== "publish") {
    return {
      valid: false,
      code: "INVALID_REQUEST",
      error: "Action must be 'publish'",
    };
  }

  if (!request.query && !request.posting_packet) {
    return {
      valid: false,
      code: "MISSING_FIELDS",
      error: "Require either query or posting_packet",
    };
  }

  return { valid: true };
}

// ============================================================================
// Main Handler
// ============================================================================

export async function handleMaikoCommand(
  request: MaikoRequest
): Promise<MaikoResponse> {
  const trace_id = request.trace_id || generateTraceId();

  try {
    // 1. Validate request
    const validation = validateRequest(request);
    if (!validation.valid) {
      return {
        ok: false,
        action: "publish",
        trace_id,
        brief: "",
        error_code: validation.code || "INVALID_REQUEST",
        error_message: validation.error || "Invalid request",
      };
    }

    // 2. Parse publishing intent
    const intent = parsePublishIntent(request.query || "", request);
    if (!intent.is_valid) {
      return {
        ok: false,
        action: "publish",
        trace_id,
        brief: "",
        error_code: "UNPARSEABLE",
        error_message: "Could not parse publishing intent from request",
      };
    }

    // 3. If no posting_packet provided, return error
    if (!request.posting_packet) {
      return {
        ok: false,
        action: "publish",
        trace_id,
        brief: "",
        error_code: "NO_RESEARCH",
        error_message: "Posting packet required to make publishing decisions",
      };
    }

    // 4. Select and edit drafts
    const decisions = await selectAndEditDrafts(
      request.posting_packet,
      intent,
      request
    );

    // 5. Format output
    const publishing_packet = formatPublishingPacket(decisions, request);
    const brief = generatePublishBrief(publishing_packet, intent);

    // 6. Post Tier A to Bluesky (if auto_publish OR auto-publishing Tier A)
    const posted_uris: string[] = [];
    if (
      publishing_packet.publish_now.length > 0 &&
      request.target_platforms?.includes("bluesky")
    ) {
      try {
        for (const post of publishing_packet.publish_now) {
          const result = await postToBluesky(post.post_text);
          posted_uris.push(result.uri);
          // Add URI to post record
          (post as any).bluesky_uri = result.uri;
        }
      } catch (error) {
        console.error("[Maiko Bluesky Error]", error);
        // Don't fail the whole request if posting fails
        // Return the decisions anyway
      }
    }

    // 7. Return success response
    return {
      ok: true,
      action: "publish",
      trace_id,
      brief,
      publish_packet: publishing_packet,
    };
  } catch (error) {
    console.error("[Maiko Handler Error]", error);
    return {
      ok: false,
      action: "publish",
      trace_id,
      brief: "",
      error_code: "INTERNAL_ERROR",
      error_message: "Internal server error during publishing decision",
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function generateTraceId(request?: MaikoRequest): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `maiko_${timestamp}_${random}`;
}
