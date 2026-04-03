/**
 * Parser for Cade Composition Requests
 * Extracts composition intent and parameters
 */

export interface ParsedCompositionIntent {
  action: "draft" | "queue" | "analyze_trends";
  batch_size: "small" | "medium" | "large";
  format_mix: string[];
  platforms: string[];
  target_tier: "a" | "ab" | "abc";
  include_trends_pass: boolean;
  is_valid: boolean;
}

/**
 * Parse user request for post composition
 */
export function parseCompositionIntent(
  text: string
): ParsedCompositionIntent {
  const normalized = text.toLowerCase().trim();

  // Detect action
  let action: "draft" | "queue" | "analyze_trends" = "draft";
  if (
    normalized.includes("queue") ||
    normalized.includes("batch") ||
    normalized.includes("daily")
  ) {
    action = "queue";
  } else if (
    normalized.includes("trend") ||
    normalized.includes("style") ||
    normalized.includes("pattern")
  ) {
    action = "analyze_trends";
  }

  // Detect batch size
  let batch_size: "small" | "medium" | "large" = "small";
  if (
    normalized.includes("many") ||
    normalized.includes("large") ||
    normalized.includes("100") ||
    normalized.includes("big")
  ) {
    batch_size = "large";
  } else if (
    normalized.includes("medium") ||
    normalized.includes("several") ||
    normalized.includes("50")
  ) {
    batch_size = "medium";
  }

  // Detect platform mix
  const platforms: string[] = [];
  if (
    !normalized.includes("bluesky") &&
    !normalized.includes("only")
  ) {
    platforms.push("x");
  }
  if (normalized.includes("bluesky") || normalized.includes("both")) {
    platforms.push("bluesky");
  }
  if (platforms.length === 0) platforms.push("x");

  // Detect format mix
  const format_mix: string[] = [];
  if (
    normalized.includes("thread") ||
    normalized.includes("all")
  ) {
    format_mix.push("thread");
  }
  if (
    normalized.includes("reply") ||
    normalized.includes("comment") ||
    normalized.includes("all")
  ) {
    format_mix.push("reply");
  }
  if (
    normalized.includes("quote") ||
    normalized.includes("commentary") ||
    normalized.includes("all")
  ) {
    format_mix.push("quote");
  }
  if (format_mix.length === 0) {
    format_mix.push("single");
  }

  // Detect tier
  let target_tier: "a" | "ab" | "abc" = "a";
  if (normalized.includes("review") || normalized.includes("b")) {
    target_tier = "ab";
  }
  if (normalized.includes("hold") || normalized.includes("c")) {
    target_tier = "abc";
  }

  // Detect if trends pass is needed
  const include_trends_pass =
    action === "analyze_trends" ||
    (action === "queue" && batch_size === "large") ||
    (action === "draft" && normalized.includes("trend"));

  return {
    action,
    batch_size,
    format_mix,
    platforms,
    target_tier,
    include_trends_pass,
    is_valid: normalized.length > 0,
  };
}

/**
 * Extract story IDs from research packet
 */
export function extractStoryIds(
  packet: any
): { openclaw: string[]; ai: string[] } {
  const openclaw: string[] = [];
  const ai: string[] = [];

  if (packet.openclaw_items) {
    openclaw.push(
      ...packet.openclaw_items.map((item: any) => item.item_id || item.id)
    );
  }

  if (packet.ai_items) {
    ai.push(
      ...packet.ai_items.map((item: any) => item.item_id || item.id)
    );
  }

  return { openclaw, ai };
}

/**
 * Filter stories by strength
 */
export function filterStrongStories(items: any[]): any[] {
  return items.filter((item) => {
    // Filter out low-confidence or weak items
    if (item.confidence === "low" && !item.why_it_matters) return false;
    if (item.status === "discard") return false;
    if (item.status === "hold") return false;
    return true;
  });
}
