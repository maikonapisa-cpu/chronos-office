/**
 * Researcher Agent Handler
 * Main orchestrator for research requests
 */

import { parseResearchIntent, generateSearchQueries } from "./parser";
import { searchForNews, isOpenClawRelated } from "./search";
import { verifyStory, mergeDuplicateStories } from "./verify";
import {
  formatResearchPacket,
  generateHumanBrief,
  ResearchPacket,
} from "./formatter";

export interface ResearcherRequest {
  source: string;
  action: string;
  query: string;
  time_window?: string;
  priority?: string;
  user_id?: string;
  trace_id?: string;
}

export interface ResearcherResponse {
  ok: boolean;
  action: string;
  trace_id?: string;
  brief?: string;
  results?: ResearchPacket;
  error_code?: string;
  error_message?: string;
}

/**
 * Main handler for research requests
 */
export async function handleResearcherCommand(
  request: ResearcherRequest
): Promise<ResearcherResponse> {
  try {
    // Validate request
    const validation = validateRequest(request);
    if (!validation.valid) {
      return {
        ok: false,
        action: "research",
        trace_id: request.trace_id,
        error_code: validation.error_code,
        error_message: validation.error_message,
      };
    }

    // Parse intent
    const intent = parseResearchIntent(request.query);
    if (!intent.is_valid) {
      return {
        ok: false,
        action: "research",
        trace_id: request.trace_id,
        error_code: "UNPARSEABLE",
        error_message: `Could not parse query: "${request.query}". Try: "latest OpenClaw news" or "latest AI news"`,
      };
    }

    // Generate search queries
    const searchQueries = generateSearchQueries(intent);
    console.log(`[Researcher] Searching: ${searchQueries.join(", ")}`);

    // Perform search
    const timeWindow = (request.time_window ||
      "today") as "today" | "past_24h" | "past_72h";
    const rawStories = await searchForNews(searchQueries, timeWindow);

    if (rawStories.length === 0) {
      // Return empty results with note
      const emptyPacket = formatResearchPacket([], [], timeWindow);
      const brief = generateHumanBrief(emptyPacket);

      return {
        ok: true,
        action: "research",
        trace_id: request.trace_id,
        brief:
          brief +
          "\nNo news found. Expanding search window or check back later.",
        results: emptyPacket,
      };
    }

    // Verify and categorize stories
    let verifiedStories = await Promise.all(
      rawStories.map((story) =>
        verifyStory(story, isOpenClawRelated(story))
      )
    );

    // Merge duplicates
    verifiedStories = mergeDuplicateStories(verifiedStories);

    // Separate OpenClaw vs AI ecosystem stories
    const openclaw_stories = verifiedStories.filter((story) =>
      isOpenClawRelated(story)
    );
    const ai_stories = verifiedStories.filter(
      (story) => !isOpenClawRelated(story)
    );

    // Sort by confidence
    openclaw_stories.sort((a, b) => {
      const confidenceRank = { high: 3, medium: 2, low: 1 };
      return (
        confidenceRank[b.confidence] - confidenceRank[a.confidence]
      );
    });
    ai_stories.sort((a, b) => {
      const confidenceRank = { high: 3, medium: 2, low: 1 };
      return confidenceRank[b.confidence] - confidenceRank[a.confidence];
    });

    // Format output
    const packet = formatResearchPacket(
      openclaw_stories,
      ai_stories,
      timeWindow
    );
    const brief = generateHumanBrief(packet);

    return {
      ok: true,
      action: "research",
      trace_id: request.trace_id,
      brief,
      results: packet,
    };
  } catch (error) {
    console.error("[Researcher Error]", error);

    return {
      ok: false,
      action: "research",
      trace_id: request.trace_id,
      error_code: "INTERNAL_ERROR",
      error_message:
        "Had trouble researching right now. Please try again in a moment.",
    };
  }
}

/**
 * Validate incoming request
 */
function validateRequest(
  request: ResearcherRequest
): { valid: boolean; error_code?: string; error_message?: string } {
  // Check required fields
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

  if (!request.query) {
    return {
      valid: false,
      error_code: "MISSING_FIELDS",
      error_message: "Missing required field: query",
    };
  }

  // Check valid values
  const validSources = ["telegram", "test", "chris", "debug"];
  if (!validSources.includes(request.source)) {
    return {
      valid: false,
      error_code: "INVALID_REQUEST",
      error_message: `Invalid source: ${request.source}`,
    };
  }

  if (request.action !== "research") {
    return {
      valid: false,
      error_code: "INVALID_REQUEST",
      error_message: `Invalid action: ${request.action}. Only "research" is supported.`,
    };
  }

  // Check optional field values
  if (request.time_window) {
    const validWindows = ["today", "past_24h", "past_72h"];
    if (!validWindows.includes(request.time_window)) {
      return {
        valid: false,
        error_code: "INVALID_REQUEST",
        error_message: `Invalid time_window: ${request.time_window}`,
      };
    }
  }

  if (request.priority) {
    const validPriorities = ["openclaw", "ai_ecosystem", "mixed"];
    if (!validPriorities.includes(request.priority)) {
      return {
        valid: false,
        error_code: "INVALID_REQUEST",
        error_message: `Invalid priority: ${request.priority}`,
      };
    }
  }

  return { valid: true };
}
// Vercel cache bust: 1775218259
