/**
 * Maiko Parser - Publishing Intent Detection
 */

import type { MaikoRequest } from "./handler";

export interface ParsedPublishIntent {
  action:
    | "draft_only"
    | "queue_for_review"
    | "schedule_batch"
    | "auto_publish";
  target_platforms: string[];
  approval_required: boolean;
  auto_publish: boolean;
  auto_reply: boolean;
  schedule_time?: string;
  batch_size: "small" | "medium" | "large";
  is_valid: boolean;
}

/**
 * Parse publishing intent from query text and request flags
 */
export function parsePublishIntent(
  text: string,
  request: MaikoRequest
): ParsedPublishIntent {
  const lower = text.toLowerCase();

  // Determine operation mode
  let action: ParsedPublishIntent["action"] = "queue_for_review";
  if (request.auto_publish && !request.approval_required) {
    action = "auto_publish";
  } else if (request.schedule_time) {
    action = "schedule_batch";
  } else if (lower.includes("draft")) {
    action = "draft_only";
  }

  // Detect target platforms from text
  const platforms = detectTargetPlatforms(text, request.target_platforms);

  // Determine batch size from text hints
  const batch_size = detectBatchSize(text);

  return {
    action,
    target_platforms: platforms,
    approval_required: request.approval_required !== false,
    auto_publish: request.auto_publish || false,
    auto_reply: request.auto_reply || false,
    schedule_time: request.schedule_time,
    batch_size,
    is_valid: true,
  };
}

/**
 * Detect target platforms from query text
 */
function detectTargetPlatforms(
  text: string,
  override?: string[]
): string[] {
  // If explicitly provided, use those
  if (override && override.length > 0) {
    return override;
  }

  const lower = text.toLowerCase();
  const platforms: string[] = [];

  if (lower.includes("x") || lower.includes("twitter")) platforms.push("x");
  if (lower.includes("bluesky")) platforms.push("bluesky");
  if (lower.includes("threads")) platforms.push("threads");
  if (lower.includes("linkedin")) platforms.push("linkedin");

  // Default to X if nothing specified
  if (platforms.length === 0) {
    platforms.push("x");
  }

  return platforms;
}

/**
 * Detect batch size from query text
 */
function detectBatchSize(text: string): "small" | "medium" | "large" {
  const lower = text.toLowerCase();

  if (
    lower.includes("one") ||
    lower.includes("single") ||
    lower.includes("small")
  ) {
    return "small";
  }

  if (lower.includes("many") || lower.includes("large") || lower.includes("big")) {
    return "large";
  }

  return "medium";
}

/**
 * Detect if text contains publishing keywords
 */
export function detectPublishingKeywords(text: string): boolean {
  const keywords = [
    "publish",
    "post",
    "share",
    "ship",
    "release",
    "live",
    "go",
  ];
  const lower = text.toLowerCase();

  return keywords.some((kw) => lower.includes(kw));
}
