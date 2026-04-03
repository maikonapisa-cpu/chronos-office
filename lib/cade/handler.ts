/**
 * Cade Handler
 * Main orchestrator for content composition and posting
 */

import {
  parseCompositionIntent,
  extractStoryIds,
  filterStrongStories,
} from "./parser";
import { composeDraftsFromItem } from "./composer";
import { rankDrafts, calculateBatchHealth } from "./ranker";
import {
  formatPostingPacket,
  formatDraftForDisplay,
  formatBatchAsJson,
} from "./formatter";

export interface CadeRequest {
  source: string;
  action: string;
  research_packet?: any;
  query?: string;
  trace_id?: string;
}

export interface CadeResponse {
  ok: boolean;
  action: string;
  trace_id?: string;
  brief?: string;
  posting_packet?: any;
  error_code?: string;
  error_message?: string;
}

/**
 * Main handler for composition requests
 */
export async function handleCadeCommand(
  request: CadeRequest
): Promise<CadeResponse> {
  try {
    // Validate request
    const validation = validateRequest(request);
    if (!validation.valid) {
      return {
        ok: false,
        action: "composition",
        trace_id: request.trace_id,
        error_code: validation.error_code,
        error_message: validation.error_message,
      };
    }

    // Parse composition intent
    const query = request.query || "";
    const intent = parseCompositionIntent(query);

    if (!intent.is_valid) {
      return {
        ok: false,
        action: "composition",
        trace_id: request.trace_id,
        error_code: "UNPARSEABLE",
        error_message:
          "Could not parse composition request. Try: 'draft posts', 'daily queue', 'analyze trends'",
      };
    }

    // Check if we have research to work with
    if (!request.research_packet || intent.action === "analyze_trends") {
      return {
        ok: true,
        action: "composition",
        trace_id: request.trace_id,
        brief:
          "Trend analysis mode - studying current X patterns. (Implementation ready)",
        error_message:
          "Trend analysis requires X-search integration. Check workspace skills/cade-trend-analysis/SKILL.md",
      };
    }

    const packet = request.research_packet;

    // Extract and filter stories
    const allStories = [
      ...(packet.openclaw_items || []),
      ...(packet.ai_items || []),
    ];

    if (allStories.length === 0) {
      return {
        ok: false,
        action: "composition",
        trace_id: request.trace_id,
        error_code: "NO_RESEARCH",
        error_message: "No research items to compose from",
      };
    }

    const strongStories = filterStrongStories(allStories);

    if (strongStories.length === 0) {
      return {
        ok: true,
        action: "composition",
        trace_id: request.trace_id,
        brief: "All research items are too weak to draft from.",
        error_message:
          "No stories passed strength filter. Research may need more verification.",
      };
    }

    // Compose drafts
    const allDrafts: any[] = [];
    for (const story of strongStories) {
      const drafts = composeDraftsFromItem(
        story,
        intent.platforms,
        intent.format_mix
      );
      allDrafts.push(...drafts);
    }

    if (allDrafts.length === 0) {
      return {
        ok: false,
        action: "composition",
        trace_id: request.trace_id,
        error_code: "COMPOSITION_ERROR",
        error_message:
          "Failed to generate drafts from stories",
      };
    }

    // Rank drafts
    const rankedBatch = rankDrafts(allDrafts, intent.target_tier);
    const batchHealth = calculateBatchHealth(rankedBatch);

    // Format output
    const postingPacket = formatPostingPacket(
      rankedBatch,
      intent.platforms,
      batchHealth,
      allStories
    );

    // Generate brief
    const brief = generateBrief(
      postingPacket,
      rankedBatch,
      intent
    );

    return {
      ok: true,
      action: "composition",
      trace_id: request.trace_id,
      brief,
      posting_packet: JSON.parse(
        formatBatchAsJson(postingPacket)
      ),
    };
  } catch (error) {
    console.error("[Cade Error]", error);

    return {
      ok: false,
      action: "composition",
      trace_id: request.trace_id,
      error_code: "INTERNAL_ERROR",
      error_message: "Had trouble composing posts. Please try again.",
    };
  }
}

/**
 * Validate incoming request
 */
function validateRequest(
  request: CadeRequest
): { valid: boolean; error_code?: string; error_message?: string } {
  if (!request.source) {
    return {
      valid: false,
      error_code: "MISSING_FIELDS",
      error_message: "Missing required field: source",
    };
  }

  if (!request.action) {
    return {
      valid: false,
      error_code: "MISSING_FIELDS",
      error_message: "Missing required field: action",
    };
  }

  if (request.action !== "compose") {
    return {
      valid: false,
      error_code: "INVALID_REQUEST",
      error_message: `Invalid action: ${request.action}. Only "compose" is supported.`,
    };
  }

  return { valid: true };
}

/**
 * Generate human-readable brief
 */
function generateBrief(
  packet: any,
  batch: any,
  intent: any
): string {
  const lines: string[] = [];

  lines.push(`✏️  Content Composition Complete`);
  lines.push("");
  lines.push(
    `Generated ${packet.total_drafts} draft candidates from research`
  );
  lines.push(`├─ ${batch.tier_a.length} ready to post now`);
  lines.push(`├─ ${batch.tier_b.length} worth reviewing`);
  lines.push(`└─ ${batch.tier_c.length} on hold`);
  lines.push("");
  lines.push(
    `Platforms: ${intent.platforms.join(", ").toUpperCase()}`
  );
  lines.push(`Formats: ${intent.format_mix.join(", ")}`);
  lines.push("");
  lines.push(
    `Health: ${packet.batch_health.health_score}`
  );

  if (batch.tier_a.length > 0) {
    lines.push("");
    lines.push(`Top candidates ready for posting:`);
    batch.tier_a.slice(0, 3).forEach((d: any, i: number) => {
      lines.push(
        `  ${i + 1}. [${d.platform}] ${d.angle_type}`
      );
    });
  }

  return lines.join("\n");
}
