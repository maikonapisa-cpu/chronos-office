/**
 * Maiko Publisher - Draft Selection, Validation, and Editing Logic
 */

import type {
  DraftCandidate,
  MaikoRequest,
  SelectedPost,
  ScheduledPost,
  QueuedPost,
  HeldPost,
  RejectedPost,
} from "./handler";
import type { ParsedPublishIntent } from "./parser";

export interface PublishingDecisions {
  publish_now: SelectedPost[];
  scheduled: ScheduledPost[];
  queue: QueuedPost[];
  held: HeldPost[];
  rejected: RejectedPost[];
  account_health_score: number;
}

/**
 * Main selection and editing pass
 */
export async function selectAndEditDrafts(
  posting_packet: any,
  intent: ParsedPublishIntent,
  request: MaikoRequest
): Promise<PublishingDecisions> {
  // Collect all drafts
  const all_drafts = [
    ...(posting_packet.tier_a_ready || []),
    ...(posting_packet.tier_b_review || []),
    ...(posting_packet.tier_c_hold || []),
  ];

  // Classify drafts into buckets
  const decisions: PublishingDecisions = {
    publish_now: [],
    scheduled: [],
    queue: [],
    held: [],
    rejected: [],
    account_health_score: 100,
  };

  // Track seen stories to prevent saturation
  const story_post_count: Map<string, number> = new Map();

  for (const draft of all_drafts) {
    // Filter by platform
    if (!intent.target_platforms.includes(draft.platform)) {
      decisions.rejected.push(
        createRejectedPost(draft, "Platform not in target set")
      );
      continue;
    }

    // Calculate publish score
    const score = calculatePublishScore(draft);

    // Validate for publishing safety
    const validation = validateForPublishing(draft);
    if (!validation.valid) {
      decisions.rejected.push(
        createRejectedPost(draft, validation.reason || "Failed validation")
      );
      continue;
    }

    // Check for duplication
    const story_id = draft.source_item_id;
    const current_count = story_post_count.get(story_id) || 0;

    if (current_count >= 2) {
      decisions.rejected.push(
        createRejectedPost(draft, "Story saturation limit reached (max 2 per day)")
      );
      continue;
    }

    // Decide bucket based on tier + confidence + freshness + mode
    const tier = detectDraftTier(posting_packet, draft);

    // **MAIKO POSTS TO BLUESKY**: Tier A auto-publishes immediately (no approval gate)
    if (
      tier === "a" &&
      draft.confidence === "high" &&
      (draft.freshness === "same-day" || draft.freshness === "past_24h")
    ) {
      // Tier A → Always publish_now (Maiko will post to Bluesky)
      const selected = createSelectedPost(
        draft,
        "publish_now",
        "Auto-publish to Bluesky: Tier A + high confidence + fresh",
        score
      );
      decisions.publish_now.push(selected);
      story_post_count.set(story_id, current_count + 1);
    } else if (tier === "a" || tier === "b") {
      // Queue for review
      const queued = createQueuedPost(draft, score, `tier_${tier}`);
      decisions.queue.push(queued);
      story_post_count.set(story_id, current_count + 1);
    } else {
      // Tier C → hold
      const held = createHeldPost(draft, "Lower tier candidate");
      decisions.held.push(held);
    }
  }

  // Sort buckets by publish_score
  decisions.publish_now.sort((a, b) => b.publish_score - a.publish_score);
  decisions.queue.sort((a, b) => (b.queue_priority || 0) - (a.queue_priority || 0));
  decisions.held.sort((a, b) => b.publish_score - a.publish_score);

  // Calculate account health score
  const total = all_drafts.length;
  const ready = decisions.publish_now.length;
  const queued = decisions.queue.length;
  const rejected = decisions.rejected.length;

  const ready_ratio = total > 0 ? ready / total : 0;
  let health = 100;
  if (ready_ratio < 0.2) health -= 20;
  if (rejected > total * 0.5) health -= 15;
  if (queued > total * 0.7) health -= 10;

  decisions.account_health_score = Math.max(0, health);

  return decisions;
}

/**
 * Detect which tier a draft came from
 */
function detectDraftTier(
  posting_packet: any,
  draft: DraftCandidate
): "a" | "b" | "c" {
  if ((posting_packet.tier_a_ready || []).find((d: any) => d.post_id === draft.post_id)) {
    return "a";
  }
  if ((posting_packet.tier_b_review || []).find((d: any) => d.post_id === draft.post_id)) {
    return "b";
  }
  return "c";
}

/**
 * Calculate publish priority score (0-100)
 */
export function calculatePublishScore(draft: DraftCandidate): number {
  let score = 50;

  // Confidence boost
  if (draft.confidence === "high") score += 25;
  else if (draft.confidence === "medium") score += 15;
  else if (draft.confidence === "low") score += 5;

  // Freshness boost
  if (draft.freshness === "same-day") score += 20;
  else if (draft.freshness === "past_24h") score += 10;
  else if (draft.freshness === "past_72h") score += 5;

  // Format bonus
  if (draft.format === "single_post") score += 10;
  else if (draft.format === "thread") score += 8;
  else if (draft.format === "reply") score += 5;

  // Risk adjustment
  if (draft.risk_notes && draft.risk_notes.length > 0) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Validate draft for safety before publishing
 */
function validateForPublishing(
  draft: DraftCandidate
): { valid: boolean; reason?: string } {
  // Check for critical risk flags
  if (
    draft.risk_notes &&
    draft.risk_notes.some(
      (note) =>
        note.includes("Do not post") || note.includes("unverified")
    )
  ) {
    return { valid: false, reason: "Critical risk flag present" };
  }

  // Check confidence for low-risk posting
  if (draft.confidence === "low" && !draft.source_list?.length) {
    return { valid: false, reason: "Low confidence + no source trace" };
  }

  // Check for empty text
  if (!draft.text || draft.text.trim().length === 0) {
    return { valid: false, reason: "Empty post text" };
  }

  return { valid: true };
}

/**
 * Create SelectedPost from draft
 */
function createSelectedPost(
  draft: DraftCandidate,
  decision: string,
  reason: string,
  score: number
): SelectedPost {
  return {
    draft_id: draft.post_id,
    post_text: draft.text,
    platform: draft.platform,
    angle_type: draft.angle_type,
    hook: draft.hook,
    source_item_id: draft.source_item_id,
    source_list: draft.source_list,
    confidence: draft.confidence,
    freshness: draft.freshness,
    publish_score: score,
    publish_decision: decision,
    decision_reason: reason,
  };
}

/**
 * Create ScheduledPost from draft
 */
function createScheduledPost(
  draft: DraftCandidate,
  schedule_time: string,
  score: number
): ScheduledPost {
  return {
    ...createSelectedPost(
      draft,
      "schedule",
      `Scheduled for ${schedule_time}`,
      score
    ),
    scheduled_time: schedule_time,
  };
}

/**
 * Create QueuedPost from draft
 */
function createQueuedPost(
  draft: DraftCandidate,
  score: number,
  priority_type: string
): QueuedPost {
  return {
    ...createSelectedPost(draft, "queue", `Queued (${priority_type})`, score),
    queue_priority: score,
  };
}

/**
 * Create HeldPost from draft
 */
function createHeldPost(draft: DraftCandidate, reason: string): HeldPost {
  return {
    ...createSelectedPost(draft, "hold", reason, calculatePublishScore(draft)),
    hold_reason: reason,
  };
}

/**
 * Create RejectedPost from draft
 */
function createRejectedPost(
  draft: DraftCandidate,
  reason: string
): RejectedPost {
  return {
    ...createSelectedPost(
      draft,
      "reject",
      reason,
      calculatePublishScore(draft)
    ),
    rejection_reason: reason,
  };
}
