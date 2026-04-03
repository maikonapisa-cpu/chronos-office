/**
 * Story Verification Logic
 * Confirms facts across multiple sources and assigns confidence levels
 */

import { RawStory, isOfficialSource, isReputableSource } from "./search";

export interface VerifiedStory extends RawStory {
  confidence: "high" | "medium" | "low";
  source_type: "official" | "reputable" | "community";
  verified_facts: string[];
  requires_additional_verification: boolean;
  notes: string;
}

/**
 * Verify a story and assign confidence level
 */
export async function verifyStory(
  story: RawStory,
  isOpenClawRelated: boolean
): Promise<VerifiedStory> {
  const sourceType = determineSourceType(story.url);
  let confidence: "high" | "medium" | "low" = "medium";
  const verified_facts: string[] = [];
  let requires_additional_verification = false;
  let notes = "";

  // Official sources: high confidence with single source
  if (sourceType === "official") {
    confidence = "high";
    verified_facts.push("Source is official");
    notes = "Official source requires no additional verification";
  }
  // Reputable sources: medium confidence, note if unverified claims
  else if (sourceType === "reputable") {
    confidence = "medium";
    verified_facts.push("Source is reputable news outlet");

    // Check for unverified claims
    if (containsSpeculativeLanguage(story.snippet)) {
      requires_additional_verification = true;
      notes = "Contains speculative language, recommend finding 2nd source";
    }
  }
  // Community sources: lower confidence, requires more verification
  else {
    confidence = "low";
    verified_facts.push("Source is community-based (forum, social, etc.)");
    requires_additional_verification = true;
    notes = "Community sources should be verified with 2+ reputable sources before posting";
  }

  return {
    ...story,
    confidence,
    source_type: sourceType,
    verified_facts,
    requires_additional_verification,
    notes,
  };
}

/**
 * Determine source type based on URL
 */
function determineSourceType(
  url: string
): "official" | "reputable" | "community" {
  if (isOfficialSource(url)) {
    return "official";
  } else if (isReputableSource(url)) {
    return "reputable";
  } else {
    return "community";
  }
}

/**
 * Check if text contains speculative or unverified language
 */
function containsSpeculativeLanguage(text: string): boolean {
  const speculativeWords = [
    "may",
    "might",
    "could",
    "rumored",
    "alleged",
    "reportedly",
    "possibly",
    "expected to",
    "likely to",
    "expected",
    "unconfirmed",
  ];

  return speculativeWords.some((word) =>
    text.toLowerCase().includes(word)
  );
}

/**
 * Extract verifiable facts from story
 */
export function extractVerifiableFacts(story: RawStory): string[] {
  const facts: string[] = [];
  const text = `${story.headline} ${story.snippet}`.toLowerCase();

  // Extract version numbers
  const versionMatch = text.match(/v?\d+\.\d+(\.\d+)?/);
  if (versionMatch) {
    facts.push(`Version: ${versionMatch[0]}`);
  }

  // Extract dates
  const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    facts.push(`Date: ${dateMatch[0]}`);
  }

  // Extract product/feature names
  if (text.includes("release")) {
    facts.push("Contains: product release");
  }
  if (text.includes("update")) {
    facts.push("Contains: product update");
  }
  if (text.includes("announcement")) {
    facts.push("Contains: announcement");
  }

  return facts;
}

/**
 * Verify story against multiple sources
 * Returns true if story can be confirmed from at least 1 additional source
 */
export async function verifyAgainstMultipleSources(
  story: RawStory,
  additionalSources: RawStory[]
): Promise<{
  verified: boolean;
  confirming_sources: RawStory[];
  confidence_boost: "high" | "medium" | "low";
}> {
  // Look for stories with similar headlines or topics
  const confirming_sources = additionalSources.filter(
    (other) =>
      other.url !== story.url && // Not the same URL
      calculateSimilarity(story.headline, other.headline) > 0.6 // Similar headline
  );

  const verified = confirming_sources.length > 0;
  const confidence_boost =
    confirming_sources.length > 1
      ? "high"
      : confirming_sources.length === 1
        ? "medium"
        : "low";

  return {
    verified,
    confirming_sources,
    confidence_boost,
  };
}

/**
 * Simple similarity calculation (word overlap)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  let matches = 0;
  words1.forEach((word) => {
    if (words2.has(word)) {
      matches++;
    }
  });

  const maxWords = Math.max(words1.size, words2.size);
  return matches / maxWords;
}

/**
 * Merge duplicate or near-duplicate stories
 */
export function mergeDuplicateStories(
  stories: VerifiedStory[]
): VerifiedStory[] {
  if (stories.length === 0) return stories;

  const merged: VerifiedStory[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < stories.length; i++) {
    if (processed.has(i)) continue;

    const story = stories[i];
    const duplicates = [i];

    // Find all duplicates/near-duplicates
    for (let j = i + 1; j < stories.length; j++) {
      if (processed.has(j)) continue;

      const similarity = calculateSimilarity(
        stories[i].headline,
        stories[j].headline
      );

      if (similarity > 0.6) {
        duplicates.push(j);
      }
    }

    // Mark as processed
    duplicates.forEach((idx) => processed.add(idx));

    // Merge if duplicates found
    if (duplicates.length > 1) {
      const mergedStory = mergeTwoStories(
        story,
        duplicates.slice(1).map((idx) => stories[idx])
      );
      merged.push(mergedStory);
    } else {
      merged.push(story);
    }
  }

  return merged;
}

/**
 * Merge two or more stories into one
 */
function mergeTwoStories(
  primary: VerifiedStory,
  additionalStories: VerifiedStory[]
): VerifiedStory {
  // Use official source as primary if available
  let mainStory = primary;

  if (primary.source_type !== "official") {
    const officialAlternative = additionalStories.find(
      (s) => s.source_type === "official"
    );
    if (officialAlternative) {
      mainStory = officialAlternative;
    }
  }

  // Collect all sources
  const all_sources = [mainStory, ...additionalStories];

  // Merge verified facts
  const merged_facts = new Set<string>();
  all_sources.forEach((story) => {
    story.verified_facts.forEach((fact) => merged_facts.add(fact));
  });

  // Use highest confidence
  const confidence = getHighestConfidence(
    all_sources.map((s) => s.confidence)
  );

  return {
    ...mainStory,
    confidence,
    verified_facts: Array.from(merged_facts),
    notes: `Merged from ${all_sources.length} sources. Primary: ${mainStory.source}`,
    snippet: `${mainStory.snippet} [Additional sources: ${additionalStories.map((s) => s.source).join(", ")}]`,
  };
}

/**
 * Get highest confidence level from multiple
 */
function getHighestConfidence(
  levels: Array<"high" | "medium" | "low">
): "high" | "medium" | "low" {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}
