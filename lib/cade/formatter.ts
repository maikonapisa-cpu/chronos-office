/**
 * Output Formatter for Cade
 * Formats drafts and batches for posting or handoff
 */

import { DraftCandidate } from "./composer";
import { RankedBatch } from "./ranker";

export interface PostingPacket {
  batch_date: string;
  timezone: string;
  platform_mix: string[];
  total_drafts: number;
  tier_a_ready: DraftCandidate[];
  tier_b_review: DraftCandidate[];
  tier_c_hold: DraftCandidate[];
  source_trace_table: Map<string, any>;
  batch_health: any;
  posting_summary: string;
}

/**
 * Format ranked batch into a posting packet
 */
export function formatPostingPacket(
  batch: RankedBatch,
  platformMix: string[],
  batchHealth: any,
  sourceItems: any[]
): PostingPacket {
  const now = new Date();
  const batchDate = now.toISOString().split("T")[0];

  // Build source trace table
  const sourceTrace = new Map();
  for (const item of sourceItems) {
    sourceTrace.set(item.item_id || item.id, {
      headline: item.headline,
      confidence: item.confidence,
      freshness: item.freshness,
      sources: item.source_list || [],
    });
  }

  // Generate posting summary
  const summary = generateSummary(batch, batchHealth);

  return {
    batch_date: batchDate,
    timezone: "Asia/Manila",
    platform_mix: platformMix,
    total_drafts:
      batch.tier_a.length +
      batch.tier_b.length +
      batch.tier_c.length,
    tier_a_ready: batch.tier_a,
    tier_b_review: batch.tier_b,
    tier_c_hold: batch.tier_c,
    source_trace_table: sourceTrace,
    batch_health: batchHealth,
    posting_summary: summary,
  };
}

/**
 * Generate human-readable posting summary
 */
function generateSummary(batch: RankedBatch, health: any): string {
  const lines: string[] = [];

  lines.push(`📋 Daily Content Batch Summary`);
  lines.push(`├─ Ready now (Tier A): ${batch.tier_a.length} drafts`);
  lines.push(`├─ Review soon (Tier B): ${batch.tier_b.length} drafts`);
  lines.push(`├─ Hold (Tier C): ${batch.tier_c.length} drafts`);
  lines.push(`└─ Discard: ${batch.discard.length} drafts`);
  lines.push("");
  lines.push(
    `Health: ${health.health_score} (${health.ready_ratio}% ready to publish)`
  );

  if (batch.tier_a.length > 0) {
    lines.push("");
    lines.push(`Top ready candidates:`);
    batch.tier_a.slice(0, 3).forEach((d, i) => {
      lines.push(`  ${i + 1}. [${d.format}] ${d.angle_type}`);
    });
  }

  if (health.repetition_warnings > 0) {
    lines.push("");
    lines.push(
      `⚠️  ${health.repetition_warnings} repetition warnings found`
    );
  }

  return lines.join("\n");
}

/**
 * Format single draft for display
 */
export function formatDraftForDisplay(draft: DraftCandidate): string {
  const lines: string[] = [];

  lines.push(`[${draft.post_id}]`);
  lines.push(`Platform: ${draft.platform} | Format: ${draft.format}`);
  lines.push(`Angle: ${draft.angle_type} | Priority: ${draft.publish_priority}`);
  lines.push(`Confidence: ${draft.confidence} | Freshness: ${draft.freshness}`);
  lines.push("");
  lines.push(`Hook: "${draft.hook}"`);
  lines.push("");
  lines.push(`${draft.text}`);
  lines.push("");
  lines.push(`Rationale: ${draft.rationale}`);

  if (draft.source_list.length > 0) {
    lines.push(`Sources: ${draft.source_list.join(", ")}`);
  }

  if (draft.risk_notes.length > 0) {
    lines.push(`⚠️  Risk notes: ${draft.risk_notes.join("; ")}`);
  }

  return lines.join("\n");
}

/**
 * Format batch as JSON for API
 */
export function formatBatchAsJson(packet: PostingPacket): string {
  const json = {
    batch_date: packet.batch_date,
    timezone: packet.timezone,
    platform_mix: packet.platform_mix,
    total_drafts: packet.total_drafts,
    batch_health: packet.batch_health,
    tier_a_ready: packet.tier_a_ready.map((d) => ({
      post_id: d.post_id,
      platform: d.platform,
      format: d.format,
      angle_type: d.angle_type,
      hook: d.hook,
      text: d.text,
      confidence: d.confidence,
      freshness: d.freshness,
      publish_priority: d.publish_priority,
    })),
    tier_b_review: packet.tier_b_review.length,
    tier_c_hold: packet.tier_c_hold.length,
  };

  return JSON.stringify(json, null, 2);
}
