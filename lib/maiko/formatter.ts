/**
 * Maiko Formatter - Output Formatting and Briefing
 */

import type {
  PublishingPacket,
  MaikoRequest,
  PostingPacket,
  StoryTrace,
} from "./handler";
import type { PublishingDecisions } from "./publisher";
import type { ParsedPublishIntent } from "./parser";

/**
 * Format publishing decisions into PublishingPacket
 */
export function formatPublishingPacket(
  decisions: PublishingDecisions,
  request: MaikoRequest
): PublishingPacket {
  const now = new Date();
  const batch_date = now.toISOString().split("T")[0];

  // Build source trace from publishing packet
  const source_trace: Map<string, StoryTrace> = new Map();

  // Extract source trace if available in original posting_packet
  if (request.posting_packet?.source_trace_table) {
    const source_table = request.posting_packet.source_trace_table;
    if (source_table instanceof Map) {
      for (const [key, value] of source_table.entries()) {
        source_trace.set(key, value);
      }
    }
  }

  // Determine status
  let status: "draft" | "approved" | "scheduled" | "published" = "draft";
  if (decisions.publish_now.length > 0 && !request.approval_required) {
    status = "approved";
  } else if (decisions.scheduled.length > 0) {
    status = "scheduled";
  }

  return {
    run_date: batch_date,
    timezone: "Asia/Manila",
    status,
    publish_now: decisions.publish_now,
    scheduled: decisions.scheduled,
    queue: decisions.queue,
    held: decisions.held,
    rejected: decisions.rejected,
    source_trace,
    account_health_score: decisions.account_health_score,
    account_health_notes: generateHealthNotes(decisions),
    mode: {
      approval_required: request.approval_required !== false,
      auto_publish: request.auto_publish || false,
      auto_reply: request.auto_reply || false,
    },
  };
}

/**
 * Generate human-readable brief
 */
export function generatePublishBrief(
  publishing_packet: PublishingPacket,
  intent: ParsedPublishIntent
): string {
  const lines: string[] = [];

  lines.push("📮 Publishing Queue Ready — " + publishing_packet.run_date);
  lines.push("");

  // Publishing status
  lines.push("Publishing Status:");
  lines.push(
    `├─ Publish now: ${publishing_packet.publish_now.length} posts (${
      publishing_packet.publish_now.length > 0
        ? publishing_packet.publish_now[0]?.platform || "x"
        : "—"
    })`
  );
  lines.push(
    `├─ Schedule (later): ${publishing_packet.scheduled.length} posts`
  );
  lines.push(
    `├─ Queue (review): ${publishing_packet.queue.length} posts`
  );
  lines.push(`├─ Hold: ${publishing_packet.held.length} posts`);
  lines.push(`└─ Reject: ${publishing_packet.rejected.length} posts`);
  lines.push("");

  // Account health
  const health_pct = publishing_packet.account_health_score;
  let health_label = "healthy";
  if (health_pct < 40) health_label = "⚠️  needs attention";
  else if (health_pct < 70) health_label = "⚠️  review recommended";

  lines.push(
    `Account Health: ${health_label} (${health_pct.toFixed(0)}% score)`
  );
  if (publishing_packet.account_health_notes) {
    lines.push(`  → ${publishing_packet.account_health_notes}`);
  }
  lines.push("");

  // Mode
  lines.push("Operating Mode:");
  lines.push(
    `├─ Approval required: ${publishing_packet.mode.approval_required}`
  );
  lines.push(`├─ Auto-publish: ${publishing_packet.mode.auto_publish}`);
  lines.push(`└─ Auto-reply: ${publishing_packet.mode.auto_reply}`);
  lines.push("");

  // Top candidates
  if (publishing_packet.publish_now.length > 0) {
    lines.push("Ready to publish:");
    for (let i = 0; i < Math.min(3, publishing_packet.publish_now.length); i++) {
      const post = publishing_packet.publish_now[i];
      lines.push(
        `  ${i + 1}. [${post.platform}] ${post.angle_type} (score: ${post.publish_score})`
      );
    }
  } else if (publishing_packet.queue.length > 0) {
    lines.push("Top candidates for review:");
    for (let i = 0; i < Math.min(3, publishing_packet.queue.length); i++) {
      const post = publishing_packet.queue[i];
      lines.push(
        `  ${i + 1}. [${post.platform}] ${post.angle_type} (priority: ${post.queue_priority})`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Generate health notes
 */
function generateHealthNotes(decisions: PublishingDecisions): string {
  const notes: string[] = [];

  const total =
    decisions.publish_now.length +
    decisions.queue.length +
    decisions.held.length;
  const ready_ratio = total > 0 ? decisions.publish_now.length / total : 0;

  if (ready_ratio > 0.8) {
    notes.push("High ready ratio — most candidates are publication-ready");
  } else if (ready_ratio < 0.2 && decisions.queue.length > 0) {
    notes.push("Most candidates need review before publishing");
  }

  if (decisions.rejected.length > total * 0.4) {
    notes.push("High rejection rate — batch quality may need attention");
  }

  if (decisions.held.length > 0 && decisions.publish_now.length === 0) {
    notes.push("No immediate candidates — only held/queued items");
  }

  return notes.length > 0 ? notes.join("; ") : "Batch health normal";
}
