/**
 * Draft Ranking System
 * Tier drafts into A (ready), B (review), C (hold)
 */

import { DraftCandidate } from "./composer";

export interface RankedBatch {
  tier_a: DraftCandidate[];
  tier_b: DraftCandidate[];
  tier_c: DraftCandidate[];
  discard: DraftCandidate[];
}

/**
 * Rank drafts into tiers
 */
export function rankDrafts(
  drafts: DraftCandidate[],
  targetTier: "a" | "ab" | "abc"
): RankedBatch {
  const batch: RankedBatch = {
    tier_a: [],
    tier_b: [],
    tier_c: [],
    discard: [],
  };

  for (const draft of drafts) {
    const tier = determineTier(draft);

    switch (tier) {
      case "a":
        batch.tier_a.push(draft);
        break;
      case "b":
        batch.tier_b.push(draft);
        break;
      case "c":
        batch.tier_c.push(draft);
        break;
      case "discard":
        batch.discard.push(draft);
        break;
    }
  }

  // Sort each tier by priority
  batch.tier_a.sort((a, b) => b.publish_priority - a.publish_priority);
  batch.tier_b.sort((a, b) => b.publish_priority - a.publish_priority);
  batch.tier_c.sort((a, b) => b.publish_priority - a.publish_priority);

  return batch;
}

/**
 * Determine tier for a single draft
 */
function determineTier(
  draft: DraftCandidate
): "a" | "b" | "c" | "discard" {
  // Discard low-quality items
  if (draft.risk_notes.includes("Do not post")) {
    return "discard";
  }

  if (draft.risk_notes.includes("Hold for review")) {
    return "c";
  }

  // Tier A: high priority, ready now
  if (draft.publish_priority >= 70) {
    if (draft.confidence === "high") {
      return "a";
    }
    if (
      draft.confidence === "medium" &&
      draft.freshness === "same-day"
    ) {
      return "a";
    }
  }

  // Tier B: medium priority, worth reviewing
  if (draft.publish_priority >= 50) {
    if (draft.confidence === "high") {
      return "b";
    }
    if (draft.confidence === "medium") {
      return "b";
    }
  }

  // Tier C: lower priority, hold for now
  return "c";
}

/**
 * Check for repetition in batch
 */
export function detectRepetition(drafts: DraftCandidate[]): string[] {
  const warnings: string[] = [];
  const seen: Map<string, number> = new Map();

  for (const draft of drafts) {
    const hook = draft.hook.toLowerCase();
    const count = seen.get(hook) || 0;

    if (count > 1) {
      warnings.push(
        `Hook "${draft.hook}" appears ${count + 1} times. Consider varying.`
      );
    }

    seen.set(hook, count + 1);
  }

  return warnings;
}

/**
 * Calculate batch health metrics
 */
export function calculateBatchHealth(batch: RankedBatch) {
  const total =
    batch.tier_a.length +
    batch.tier_b.length +
    batch.tier_c.length;

  const readyRatio = total > 0 ? batch.tier_a.length / total : 0;
  const repetitionWarnings = detectRepetition([
    ...batch.tier_a,
    ...batch.tier_b,
  ]);

  return {
    total_drafts: total,
    tier_a_count: batch.tier_a.length,
    tier_b_count: batch.tier_b.length,
    tier_c_count: batch.tier_c.length,
    discard_count: batch.discard.length,
    ready_ratio: Math.round(readyRatio * 100),
    repetition_warnings: repetitionWarnings.length,
    health_score:
      batch.tier_a.length > 0 && repetitionWarnings.length === 0
        ? "healthy"
        : "review_recommended",
  };
}
