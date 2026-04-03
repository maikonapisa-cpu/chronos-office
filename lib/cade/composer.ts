/**
 * Content Composer for Cade
 * Generates draft posts from verified stories
 */

export interface DraftCandidate {
  post_id: string;
  source_item_id: string;
  platform: string;
  format: string;
  angle_type: string;
  hook: string;
  text: string;
  rationale: string;
  confidence: string;
  freshness: string;
  publish_priority: number;
  source_list: string[];
  risk_notes: string[];
}

export interface DraftBase {
  source_item_id?: string;
  angle_type?: string;
  hook?: string;
  text?: string;
  rationale?: string;
  confidence?: string;
  freshness?: string;
  source_list?: string[];
  risk_notes?: string[];
}

/**
 * Compose draft posts from a research item
 */
export function composeDraftsFromItem(
  item: any,
  platformMix: string[],
  formatMix: string[]
): DraftCandidate[] {
  const drafts: DraftCandidate[] = [];

  if (!item) return drafts;

  const baseId = item.item_id || item.id || `item_${Date.now()}`;
  let postCounter = 0;

  // Single post format
  if (formatMix.includes("single")) {
    const singleDrafts = generateSinglePosts(item, baseId);
    for (const platform of platformMix) {
      for (const draft of singleDrafts) {
        postCounter++;
        drafts.push({
          post_id: `${baseId}_single_${postCounter}`,
          source_item_id: baseId,
          platform,
          format: "single_post",
          angle_type: draft.angle_type || "",
          hook: draft.hook || "",
          text: draft.text || "",
          rationale: draft.rationale || "",
          confidence: draft.confidence || "medium",
          freshness: draft.freshness || "past_24h",
          publish_priority: calculatePriority(item, "single", platform),
          source_list: draft.source_list || [],
          risk_notes: draft.risk_notes || [],
        });
      }
    }
  }

  // Thread format
  if (formatMix.includes("thread")) {
    const threadDrafts = generateThreadStarters(item, baseId);
    for (const platform of platformMix) {
      for (const draft of threadDrafts) {
        postCounter++;
        drafts.push({
          post_id: `${baseId}_thread_${postCounter}`,
          source_item_id: baseId,
          platform,
          format: "thread",
          angle_type: draft.angle_type || "",
          hook: draft.hook || "",
          text: draft.text || "",
          rationale: draft.rationale || "",
          confidence: draft.confidence || "medium",
          freshness: draft.freshness || "past_24h",
          publish_priority:
            calculatePriority(item, "thread", platform) - 1,
          source_list: draft.source_list || [],
          risk_notes: draft.risk_notes || [],
        });
      }
    }
  }

  // Reply format
  if (formatMix.includes("reply")) {
    const replyDrafts = generateReplies(item, baseId);
    for (const platform of platformMix) {
      for (const draft of replyDrafts) {
        postCounter++;
        drafts.push({
          post_id: `${baseId}_reply_${postCounter}`,
          source_item_id: baseId,
          platform,
          format: "reply",
          angle_type: draft.angle_type || "",
          hook: draft.hook || "",
          text: draft.text || "",
          rationale: draft.rationale || "",
          confidence: draft.confidence || "medium",
          freshness: draft.freshness || "past_24h",
          publish_priority:
            calculatePriority(item, "reply", platform) - 2,
          source_list: draft.source_list || [],
          risk_notes: draft.risk_notes || [],
        });
      }
    }
  }

  // Quote/commentary format
  if (formatMix.includes("quote")) {
    const quoteDrafts = generateQuoteCommentary(item, baseId);
    for (const platform of platformMix) {
      for (const draft of quoteDrafts) {
        postCounter++;
        drafts.push({
          post_id: `${baseId}_quote_${postCounter}`,
          source_item_id: baseId,
          platform,
          format: "quote_post",
          angle_type: draft.angle_type || "",
          hook: draft.hook || "",
          text: draft.text || "",
          rationale: draft.rationale || "",
          confidence: draft.confidence || "medium",
          freshness: draft.freshness || "past_24h",
          publish_priority: calculatePriority(item, "quote", platform),
          source_list: draft.source_list || [],
          risk_notes: draft.risk_notes || [],
        });
      }
    }
  }

  return drafts;
}

/**
 * Generate single-post drafts
 */
function generateSinglePosts(item: any, baseId: string): DraftBase[] {
  const drafts: DraftBase[] = [];

  // Angle 1: Direct/breaking
  if (item.headline) {
    drafts.push({
      source_item_id: baseId,
      angle_type: "breaking",
      hook: item.headline,
      text: `${item.headline}\n\n${item.why_it_matters || item.summary}`,
      rationale: "Direct announcement of the news with context on why it matters.",
      confidence: item.confidence || "medium",
      freshness: item.freshness || "past_24h",
      source_list: extractSourceUrls(item.source_list),
      risk_notes: [],
    });
  }

  // Angle 2: Workflow implication
  if (item.what_changed) {
    drafts.push({
      source_item_id: baseId,
      angle_type: "workflow_implication",
      hook: `What changed: ${item.headline?.substring(0, 50)}...`,
      text: `${item.headline}\n\nWhat this means:\n${item.what_changed}`,
      rationale: "Focus on practical implications for builders.",
      confidence: item.confidence || "medium",
      freshness: item.freshness || "past_24h",
      source_list: extractSourceUrls(item.source_list),
      risk_notes:
        item.confidence === "low"
          ? ["Low confidence - verify before posting"]
          : [],
    });
  }

  // Angle 3: Why it matters (operator take)
  if (item.why_it_matters) {
    drafts.push({
      source_item_id: baseId,
      angle_type: "operator_take",
      hook: `${item.headline}`,
      text: `${item.headline}\n\nWhy this matters: ${item.why_it_matters}`,
      rationale: "Operator-focused explanation of significance.",
      confidence: item.confidence || "medium",
      freshness: item.freshness || "past_24h",
      source_list: extractSourceUrls(item.source_list),
      risk_notes: [],
    });
  }

  return drafts;
}

/**
 * Generate thread starter drafts
 */
function generateThreadStarters(item: any, baseId: string): DraftBase[] {
  const drafts: DraftBase[] = [];

  if (!item.headline) return drafts;

  // Thread: what / why / how
  const threadText =
    `${item.headline}\n\n` +
    `here's what changed 👇\n\n` +
    `1. the update\n${item.what_changed || item.summary}\n\n` +
    `2. why it matters\n${item.why_it_matters}\n\n` +
    `3. next steps\nwatch for…`;

  drafts.push({
    source_item_id: baseId,
    angle_type: "explainer_thread",
    hook: item.headline,
    text: threadText,
    rationale: "Structured thread breaking down the story.",
    confidence: item.confidence || "medium",
    freshness: item.freshness || "past_24h",
    source_list: extractSourceUrls(item.source_list),
    risk_notes: [],
  });

  return drafts;
}

/**
 * Generate reply-style drafts
 */
function generateReplies(item: any, baseId: string): DraftBase[] {
  const drafts: DraftBase[] = [];

  // Short reply: what happened
  if (item.headline) {
    drafts.push({
      source_item_id: baseId,
      angle_type: "quick_context",
      hook: "quick context:",
      text: `${item.headline}`,
      rationale: "Fast, contextual reply ready for quote posts.",
      confidence: item.confidence || "medium",
      freshness: item.freshness || "past_24h",
      source_list: extractSourceUrls(item.source_list),
      risk_notes: [],
    });
  }

  return drafts;
}

/**
 * Generate quote/commentary drafts
 */
function generateQuoteCommentary(item: any, baseId: string): DraftBase[] {
  const drafts: DraftBase[] = [];

  if (!item.headline) return drafts;

  // Commentary angle 1: builder relevance
  drafts.push({
    source_item_id: baseId,
    angle_type: "builder_relevance",
    hook: "for builders: ",
    text: `for builders: ${item.headline.toLowerCase()}\n\n→ ${item.why_it_matters}`,
    rationale: "Commentary emphasizing practical builder implications.",
    confidence: item.confidence || "medium",
    freshness: item.freshness || "past_24h",
    source_list: extractSourceUrls(item.source_list),
    risk_notes: [],
  });

  return drafts;
}

/**
 * Calculate publish priority (0-100)
 */
function calculatePriority(
  item: any,
  format: string,
  platform: string
): number {
  let score = 50;

  // Confidence boost
  if (item.confidence === "high") score += 20;
  else if (item.confidence === "medium") score += 10;

  // Freshness boost
  if (item.freshness === "same-day") score += 15;
  else if (item.freshness === "past_24h") score += 5;

  // Format adjustments
  if (format === "single") score += 5;
  if (format === "thread") score -= 2;
  if (format === "reply") score -= 5;

  // Platform adjustments
  if (platform === "x") score += 3;

  return Math.min(100, Math.max(0, score));
}

/**
 * Extract source URLs from source list
 */
function extractSourceUrls(sourceList: any[]): string[] {
  if (!sourceList) return [];
  if (Array.isArray(sourceList)) {
    if (
      sourceList.length > 0 &&
      typeof sourceList[0] === "string"
    ) {
      return sourceList;
    }
    if (
      sourceList.length > 0 &&
      typeof sourceList[0] === "object"
    ) {
      return sourceList.map((s) => s.url || s.link || "").filter(Boolean);
    }
  }
  return [];
}
