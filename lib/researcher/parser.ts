/**
 * Parser for Research Intent
 * Extracts query type, time window, and priority from user message
 */

export interface ParsedResearchIntent {
  query_type: "openclaw" | "ai_ecosystem" | "mixed";
  time_window: "today" | "past_24h" | "past_72h";
  normalized_query: string;
  is_valid: boolean;
}

/**
 * Parse user query to extract research intent
 */
export function parseResearchIntent(text: string): ParsedResearchIntent {
  const normalized = text.toLowerCase().trim();

  // Detect time window
  const time_window = detectTimeWindow(normalized);

  // Detect priority (OpenClaw vs AI news)
  const query_type = detectQueryType(normalized);

  // Normalize query text
  const normalized_query = normalizeQueryText(normalized);

  return {
    query_type,
    time_window,
    normalized_query,
    is_valid: normalized_query.length > 0,
  };
}

/**
 * Detect time window from query
 */
function detectTimeWindow(text: string): "today" | "past_24h" | "past_72h" {
  // Check for explicit time window references
  if (
    text.includes("72h") ||
    text.includes("72 hours") ||
    text.includes("3 days") ||
    text.includes("three days")
  ) {
    return "past_72h";
  }

  if (
    text.includes("24h") ||
    text.includes("24 hours") ||
    text.includes("yesterday") ||
    text.includes("past day")
  ) {
    return "past_24h";
  }

  // Default: today/now
  return "today";
}

/**
 * Detect query type: OpenClaw-focused, AI-focused, or mixed
 */
function detectQueryType(
  text: string
): "openclaw" | "ai_ecosystem" | "mixed" {
  const openclaw_keywords = [
    "openclaw",
    "chronos",
    "chris",
    "researcher",
    "claude",
    "anthropic",
    "skill",
    "integration",
    "calendar",
    "agent",
  ];

  const ai_keywords = [
    "ai",
    "artificial intelligence",
    "model",
    "llm",
    "framework",
    "deepseek",
    "openai",
    "google",
    "ecosystem",
    "tooling",
    "agent framework",
  ];

  const openclaw_count = openclaw_keywords.filter((kw) =>
    text.includes(kw)
  ).length;
  const ai_count = ai_keywords.filter((kw) => text.includes(kw)).length;

  if (openclaw_count > ai_count && openclaw_count > 0) {
    return "openclaw";
  } else if (ai_count > openclaw_count && ai_count > 0) {
    return "ai_ecosystem";
  } else {
    return "mixed";
  }
}

/**
 * Normalize query text for search
 */
function normalizeQueryText(text: string): string {
  // Remove time references
  let normalized = text
    .replace(/\b(today|yesterday|past \d+ (hours?|days?))\b/gi, "")
    .replace(/\b\d+\s*(hours?|days?|h|d)\b/gi, "")
    .replace(/\b(latest|new|recent|what's? (?:new|happening))\b/gi, "news")
    .trim();

  // Clean up whitespace
  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}

/**
 * Extract search keywords from parsed intent
 */
export function generateSearchQueries(intent: ParsedResearchIntent): string[] {
  const queries: string[] = [];

  switch (intent.query_type) {
    case "openclaw":
      queries.push('OpenClaw news -reddit -twitter');
      queries.push('site:github.com/anthropics');
      queries.push('site:anthropic.com news');
      queries.push("OpenClaw release OR integration OR skill");
      break;

    case "ai_ecosystem":
      queries.push("AI news latest");
      queries.push("AI model release");
      queries.push("AI agent framework");
      queries.push("OpenAI OR DeepSeek OR Claude announcement");
      break;

    case "mixed":
      queries.push("OpenClaw news");
      queries.push("AI news latest");
      queries.push('site:github.com/anthropics releases');
      break;
  }

  return queries;
}
