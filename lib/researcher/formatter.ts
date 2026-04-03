/**
 * Output Formatter
 * Converts verified stories into human brief and machine packet
 */

import { VerifiedStory } from "./verify";

export interface ResearchItem {
  headline: string;
  summary: string;
  why_it_matters: string;
  freshness: "same-day" | "past_24h" | "past_72h";
  confidence: "high" | "medium" | "low";
  source_list: Array<{
    name: string;
    url: string;
    type: "official" | "reputable" | "community";
  }>;
  suggested_post_angles: string[];
  suggested_reply_angles: string[];
}

export interface ResearchPacket {
  run_date: string;
  timezone: string;
  openclaw_items: ResearchItem[];
  ai_items: ResearchItem[];
  poster_notes: {
    what_is_strong: string;
    what_needs_verification: string;
    what_to_ignore: string;
  };
}

/**
 * Format stories into a research packet
 */
export function formatResearchPacket(
  openclaw_stories: VerifiedStory[],
  ai_stories: VerifiedStory[],
  timeWindow: "today" | "past_24h" | "past_72h"
): ResearchPacket {
  const today = new Date();
  const run_date = today.toISOString().split("T")[0]; // YYYY-MM-DD

  // Convert stories to research items
  const openclaw_items = openclaw_stories.map((story) =>
    convertStoryToItem(story, timeWindow)
  );
  const ai_items = ai_stories.map((story) => convertStoryToItem(story, timeWindow));

  // Generate poster notes
  const poster_notes = generatePosterNotes(
    openclaw_items,
    ai_items
  );

  return {
    run_date,
    timezone: "Asia/Manila",
    openclaw_items,
    ai_items,
    poster_notes,
  };
}

/**
 * Convert a verified story to research item
 */
function convertStoryToItem(
  story: VerifiedStory,
  timeWindow: string
): ResearchItem {
  const freshness = determineFreshness(story.publish_date, timeWindow);

  return {
    headline: story.headline,
    summary: generateSummary(story),
    why_it_matters: generateWhyItMatters(story),
    freshness,
    confidence: story.confidence,
    source_list: [
      {
        name: story.source,
        url: story.url,
        type: story.source_type,
      },
    ],
    suggested_post_angles: generatePostAngles(story),
    suggested_reply_angles: generateReplyAngles(story),
  };
}

/**
 * Determine freshness based on publish date
 */
function determineFreshness(
  publishDate: string | undefined,
  timeWindow: string
): "same-day" | "past_24h" | "past_72h" {
  // If no date, assume same-day to be conservative
  if (!publishDate) return "same-day";

  const publishTime = new Date(publishDate);
  const now = new Date();
  const diffMs = now.getTime() - publishTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 24) {
    return "same-day";
  } else if (diffHours <= 48) {
    return "past_24h";
  } else {
    return "past_72h";
  }
}

/**
 * Generate concise summary from story
 */
function generateSummary(story: VerifiedStory): string {
  // Use first 150 characters of snippet, or full snippet if shorter
  const summary = story.content || story.snippet;
  if (summary.length > 150) {
    return summary.substring(0, 150) + "...";
  }
  return summary;
}

/**
 * Generate "why it matters" explanation
 */
function generateWhyItMatters(story: VerifiedStory): string {
  const text = `${story.headline} ${story.snippet}`.toLowerCase();

  if (text.includes("release") || text.includes("launch")) {
    return "New release or feature launch. Impacts users who adopt this tool/product.";
  }

  if (text.includes("update") || text.includes("improvement")) {
    return "Product update or improvement. Affects existing users.";
  }

  if (text.includes("integration") || text.includes("plugin")) {
    return "New integration or plugin. Expands ecosystem capability.";
  }

  if (text.includes("security") || text.includes("vulnerability")) {
    return "Security update. Recommend users upgrade for safety.";
  }

  if (text.includes("model") || text.includes("ai")) {
    return "AI platform update. May enable new agent capabilities.";
  }

  return "Important update in the ecosystem. Relevant to builders.";
}

/**
 * Generate suggested post angles
 */
function generatePostAngles(story: VerifiedStory): string[] {
  const headline = story.headline;
  const text = headline.toLowerCase();

  const angles: string[] = [];

  // Angle 1: Direct announcement
  angles.push(`${headline}`);

  // Angle 2: Impact angle
  if (text.includes("release")) {
    angles.push(`New: ${headline.replace(/released?/i, "").trim()}`);
  } else if (text.includes("update")) {
    angles.push(`What changed: ${headline.replace(/updated?/i, "").trim()}`);
  } else {
    angles.push(`Breaking: ${headline}`);
  }

  // Angle 3: Contextual angle
  if (text.includes("openclaw")) {
    angles.push(`OpenClaw just made ${headline.split(" ").slice(2, 6).join(" ")}`);
  } else if (text.includes("ai")) {
    angles.push(`AI ecosystem update: ${headline}`);
  } else {
    angles.push(`Here's why this matters: ${headline.substring(0, 50)}`);
  }

  return angles;
}

/**
 * Generate suggested reply angles
 */
function generateReplyAngles(story: VerifiedStory): string[] {
  const text = story.headline.toLowerCase();

  const angles: string[] = [];

  if (text.includes("release")) {
    angles.push("How does this compare to previous version?");
    angles.push("Available now or coming soon?");
  } else if (text.includes("security")) {
    angles.push("Do existing users auto-patch?");
    angles.push("Any workarounds if you can't update?");
  } else if (text.includes("integration")) {
    angles.push("How does this fit into the ecosystem?");
    angles.push("Any friction during setup?");
  } else {
    angles.push("What's the main use case?");
    angles.push("When will this be available?");
  }

  return angles;
}

/**
 * Generate poster notes based on story quality
 */
function generatePosterNotes(
  openclaw_items: ResearchItem[],
  ai_items: ResearchItem[]
): {
  what_is_strong: string;
  what_needs_verification: string;
  what_to_ignore: string;
} {
  const strong: string[] = [];
  const needs_verification: string[] = [];
  const ignore: string[] = [];

  // Analyze OpenClaw items
  openclaw_items.forEach((item, idx) => {
    if (item.confidence === "high") {
      strong.push(`OpenClaw #${idx + 1}: Official, ready to post`);
    } else if (item.confidence === "medium") {
      needs_verification.push(`OpenClaw #${idx + 1}: Verify timing and details`);
    } else {
      ignore.push(`OpenClaw #${idx + 1}: Low confidence, skip`);
    }
  });

  // Analyze AI items
  ai_items.forEach((item, idx) => {
    if (item.confidence === "high" && item.freshness === "same-day") {
      strong.push(`AI #${idx + 1}: Same-day, official, strong signal`);
    } else if (item.confidence === "medium") {
      needs_verification.push(`AI #${idx + 1}: Verify relevance to OpenClaw users`);
    } else {
      ignore.push(`AI #${idx + 1}: Lower priority`);
    }
  });

  return {
    what_is_strong:
      strong.length > 0
        ? strong.join("; ")
        : "Review confidence levels before posting",
    what_needs_verification:
      needs_verification.length > 0
        ? needs_verification.join("; ")
        : "All items verified",
    what_to_ignore:
      ignore.length > 0
        ? ignore.join("; ")
        : "No low-confidence items",
  };
}

/**
 * Generate human-readable brief
 */
export function generateHumanBrief(
  packet: ResearchPacket
): string {
  const total_stories = packet.openclaw_items.length + packet.ai_items.length;

  let brief = `📰 News Brief — ${packet.run_date} (${packet.timezone})\n\n`;

  // Add OpenClaw items
  if (packet.openclaw_items.length > 0) {
    brief += "**OpenClaw News:**\n";
    packet.openclaw_items.forEach((item, idx) => {
      brief += `${idx + 1}. ${item.headline}\n`;
      brief += `   → ${item.why_it_matters} [${item.confidence}]\n`;
    });
    brief += "\n";
  } else {
    brief += "No same-day OpenClaw news found.\n\n";
  }

  // Add AI items
  if (packet.ai_items.length > 0) {
    brief += "**AI Ecosystem News:**\n";
    packet.ai_items.forEach((item, idx) => {
      brief += `${idx + 1}. ${item.headline}\n`;
      brief += `   → ${item.why_it_matters} [${item.confidence}]\n`;
    });
    brief += "\n";
  }

  // Add summary
  if (total_stories === 0) {
    brief += "No stories found in search window.";
  } else {
    brief += `Total: ${total_stories} stories. Ready for Poster agent.`;
  }

  return brief;
}
